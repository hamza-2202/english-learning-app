# **VOCABY - English Learning App**



A full-featured English Language Learning Platform designed for students, teachers, and administrators. It offers structured lessons, assignments, quizzes, social learning, progress tracking, and leaderboard-based gamification. Built with a scalable, role-based architecture and optimized for real-time communication and collaborative learning.



#### **Table of Contents**

* Core Features
* User Roles



1. &nbsp;  Student Features
2. &nbsp;  Teacher Features
3. &nbsp;  Admin Features



* Progress Tracking Model
* Leaderboard System
* Certificates
* Comments System
* Authentication
* Tech Stack
* Folder Structure (Recommended)
* Setup \& Installation
* Environment Variables



#### **Overview**



The English Learning App is a multi-role online education system tailored for learners at the Beginner, Intermediate, and Advanced levels. It integrates course delivery, quizzes, assignments, real-time chat, progress tracking, analytics, and certificate generation—making it ideal for institutes and online academies.



#### **Core Features**



* Secure Login/Register + Social Login (Google, Facebook)
* Role-based access (Student, Teacher, Admin)
* Lessons, quizzes, assignments, announcements
* Progress tracking with multi-metric scoring
* Weekly leaderboard with auto-reset
* Teacher dashboard for content \& submission management
* Admin dashboard for moderation, analytics \& user management
* Real-time student chat across all levels
* Certificate generation upon course completion
* Profile \& level management



#### **USER ROLES**



##### **Student Feature:**



###### **Learning**

* Watch lessons for their selected level.
* View announcements published by teachers.
* Submit quizzes and assignments.
* Engage with lessons through comments (CRUD on own comments).



###### **Tracking \& Performance**



**Track detailed progress:**

* level
* rank
* completedLessons
* completedQuizzes
* completedAssignments
* permanentPoints – earned by watching lessons
* weeklyPoints – earned by quizzes and assignments
* totalPoints – sum of permanent + weekly points



###### **Leaderboard**

* Weekly leaderboard shows top-performing students.
* Leaderboard resets every Monday (all students’ weeklyPoints = 0).



###### **Certificates**

Students can view \& generate a certificate after completing:

1. All lessons
2. All quizzes
3. All assignments

for their current level.



###### **Profile**

* Update profile information.
* Change their level (Beginner / Intermediate / Advance).



###### **Social Interaction**



* Real-time chat with students across all levels.



##### **Teacher Features:**



###### **Content Management**

* Create, update, and manage lessons.
* Create and manage quizzes, assignments, and announcements across different levels.



###### **Student Submissions**

* View assignment submissions made by students.
* Mark/Grade assignment submissions.
* Give feedback to submissions.



###### **Student Monitoring**

* View individual student progress.
* View weekly leaderboard.



##### **Admin Features**



###### **User \& Role Management**

* Manage all users (students + teachers).
* Create teacher accounts.
* Change user roles (student ↔ teacher ↔ admin).



###### **Content Moderation**

* Full CRUD access on all lessons.
* Approve or reject quizzes and assignments created by teachers.



###### **Analytics \& Monitoring**

* Access platform-wide analytics dashboard.
* Track student progress across all levels.
* View global leaderboard.



#### **Progress Tracking Model**



Each student has a Progress document containing:

1. ***Field	Description***

* user	    Student ID
* level	    Current level of the learner
* completedLessons	    Lessons fully watched
* completedQuizzes	    Quizzes attempted
* completedAssignments	    Assignments submitted
* permanentPoints	    Points from watching lessons
* weeklyPoints	        Points from quizzes \& assignments
* totalPoints	        Sum of permanent + weekly points

Progress updates dynamically across the platform.



#### **Leaderboard System**



* Leaderboard uses totalPoints for ranking.
* Developers can configure custom weight metrics if needed.
* weeklyPoints reset every Monday via scheduled cron jobs.
* Encourages competitive and consistent learning.



#### **Certificates**



* A certificate is generated when a student completes:

1. &nbsp;   All lessons for their level
2. &nbsp;   All quizzes
3. &nbsp;   All assignments

* Certificates are downloadable and can be verified in future versions.



#### **Comments System**



* Students can post, edit, and delete their own comments.
* Teachers can delete any comment for content moderation.
* Supports nested or flat comment models.



#### **Authentication**



* Email/password login
* Google \& Facebook OAuth
* JWT-based authentication
* Access control using role-based authorization middleware



#### **Tech Stack**



###### **Frontend**

* React.js – Component-based UI development
* CSS Modules – Isolated \& modular styling
* Redux Toolkit – Global state management
* React Query – API data fetching, caching \& synchronization
* React Hot Toast – Modern toast notifications
* TinyMCE Editor – Rich text editor
* Socket.io (client) – Real-time chat functionality



###### **Backend**

* Node.js (Express)
* MongoDB + Mongoose
* JWT Authentication
* Passport.js – Social Signups
* Nodemailer – Sending Mails
* Cron Jobs for weekly resets
* Socket.io – Real-time chatting



###### **1. Install Backend**

* cd backend
* npm install



#### **Environment Variables**



* PORT=
* MONGO\_URI=
* JWT\_SECRET\_KEY=
* EMAIL\_PASS=
* EMAIL\_USER=
* JWT\_RESET\_SECRET=
* FRONTEND\_URL=
* GOOGLE\_CLIENT\_ID=
* GOOGLE\_CLIENT\_SECRET=
* FACEBOOK\_APP\_ID=
* FACEBOOK\_APP\_SECRET=
* CHAT\_PERSIST=
