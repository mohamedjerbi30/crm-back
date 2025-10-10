/*
  # Create Courses Management Schema

  ## Overview
  This migration creates tables for managing courses, instructors, and course schedules
  in a Pilates/fitness CRM system.

  ## New Tables

  ### 1. `instructors` Table
  - `id` (uuid, primary key) - Unique instructor identifier
  - `user_id` (uuid) - Reference to auth.users table
  - `name` (text) - Instructor full name
  - `bio` (text) - Instructor biography
  - `avatar_url` (text) - Profile image URL
  - `specialties` (text[]) - Array of specialties (e.g., Pilates, Yoga)
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 2. `courses` Table
  - `id` (uuid, primary key) - Unique course identifier
  - `title` (text) - Course title (e.g., "Pilates Intermédiaire")
  - `level` (text) - Course level (Débutant, Intermédiaire, Avancé)
  - `description` (text) - Short course description
  - `about` (text) - Detailed course information
  - `price` (decimal) - Course price
  - `currency` (text) - Currency code (default: DT for Tunisian Dinar)
  - `image_url` (text) - Course image URL
  - `instructor_id` (uuid) - Reference to instructor
  - `duration_minutes` (integer) - Default session duration
  - `max_participants` (integer) - Maximum number of participants
  - `is_active` (boolean) - Whether course is currently offered
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 3. `course_schedules` Table
  - `id` (uuid, primary key) - Unique schedule identifier
  - `course_id` (uuid) - Reference to course
  - `day_of_week` (text) - Day name (Lundi, Mardi, etc.)
  - `start_time` (time) - Session start time
  - `duration_minutes` (integer) - Session duration
  - `created_at` (timestamptz) - Creation timestamp

  ## Security
  - Enable RLS on all tables
  - Authenticated users can view all courses and schedules
  - Only authenticated users with admin role can create/update/delete courses
  - Instructors can update their own profile

  ## Notes
  1. Prices are stored as numeric(10,2) for precision
  2. Schedules support recurring weekly sessions
  3. All timestamps use timezone-aware types
*/

-- Create instructors table
CREATE TABLE IF NOT EXISTS instructors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  bio text DEFAULT '',
  avatar_url text,
  specialties text[] DEFAULT ARRAY[]::text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create courses table
CREATE TABLE IF NOT EXISTS courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  level text NOT NULL CHECK (level IN ('Débutant', 'Intermédiaire', 'Avancé')),
  description text NOT NULL,
  about text DEFAULT '',
  price numeric(10,2) NOT NULL DEFAULT 0,
  currency text DEFAULT 'DT',
  image_url text,
  instructor_id uuid REFERENCES instructors(id) ON DELETE SET NULL,
  duration_minutes integer DEFAULT 75,
  max_participants integer DEFAULT 10,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create course schedules table
CREATE TABLE IF NOT EXISTS course_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  day_of_week text NOT NULL CHECK (day_of_week IN ('Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche')),
  start_time time NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 75,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_courses_instructor ON courses(instructor_id);
CREATE INDEX IF NOT EXISTS idx_courses_level ON courses(level);
CREATE INDEX IF NOT EXISTS idx_courses_active ON courses(is_active);
CREATE INDEX IF NOT EXISTS idx_schedules_course ON course_schedules(course_id);
CREATE INDEX IF NOT EXISTS idx_schedules_day ON course_schedules(day_of_week);

-- Enable Row Level Security
ALTER TABLE instructors ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_schedules ENABLE ROW LEVEL SECURITY;

-- RLS Policies for instructors table
CREATE POLICY "Anyone can view instructors"
  ON instructors FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own instructor profile"
  ON instructors FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can insert instructors"
  ON instructors FOR INSERT
  TO authenticated
  WITH CHECK (auth.jwt()->>'role' = 'admin' OR auth.uid() = user_id);

CREATE POLICY "Admins can delete instructors"
  ON instructors FOR DELETE
  TO authenticated
  USING (auth.jwt()->>'role' = 'admin');

-- RLS Policies for courses table
CREATE POLICY "Anyone can view active courses"
  ON courses FOR SELECT
  TO authenticated
  USING (is_active = true OR auth.jwt()->>'role' = 'admin');

CREATE POLICY "Admins can insert courses"
  ON courses FOR INSERT
  TO authenticated
  WITH CHECK (auth.jwt()->>'role' = 'admin');

CREATE POLICY "Admins can update courses"
  ON courses FOR UPDATE
  TO authenticated
  USING (auth.jwt()->>'role' = 'admin')
  WITH CHECK (auth.jwt()->>'role' = 'admin');

CREATE POLICY "Admins can delete courses"
  ON courses FOR DELETE
  TO authenticated
  USING (auth.jwt()->>'role' = 'admin');

-- RLS Policies for course_schedules table
CREATE POLICY "Anyone can view schedules"
  ON course_schedules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert schedules"
  ON course_schedules FOR INSERT
  TO authenticated
  WITH CHECK (auth.jwt()->>'role' = 'admin');

CREATE POLICY "Admins can update schedules"
  ON course_schedules FOR UPDATE
  TO authenticated
  USING (auth.jwt()->>'role' = 'admin')
  WITH CHECK (auth.jwt()->>'role' = 'admin');

CREATE POLICY "Admins can delete schedules"
  ON course_schedules FOR DELETE
  TO authenticated
  USING (auth.jwt()->>'role' = 'admin');

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_instructors_updated_at
  BEFORE UPDATE ON instructors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_courses_updated_at
  BEFORE UPDATE ON courses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();