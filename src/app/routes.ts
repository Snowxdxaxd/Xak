import { createBrowserRouter } from "react-router";
import { Root } from './pages/Root';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { Courses } from './pages/Courses';
import { CourseView } from './pages/CourseView';
import { LessonView } from './pages/LessonView';
import { Messenger } from './pages/Messenger';
import { Profile } from './pages/Profile';
import { Settings } from './pages/Settings';
import { AdminPanel } from './pages/AdminPanel';
import { ParentDashboard } from './pages/ParentDashboard';
import { Leaderboard } from './pages/Leaderboard';
import { GradesPage } from './pages/GradesPage';
import { GroupsPage } from './pages/GroupsPage';

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, Component: Home },
      { path: "login", Component: Login },
      { path: "register", Component: Register },
      { path: "dashboard", Component: Dashboard },
      { path: "courses", Component: Courses },
      { path: "course/:id", Component: CourseView },
      { path: "lesson/:id", Component: LessonView },
      { path: "messenger", Component: Messenger },
      { path: "profile", Component: Profile },
      { path: "settings", Component: Settings },
      { path: "admin", Component: AdminPanel },
      { path: "parent-dashboard", Component: ParentDashboard },
      { path: "leaderboard", Component: Leaderboard },
      { path: "grades", Component: GradesPage },
      { path: "groups", Component: GroupsPage },
    ],
  },
]);
