# Task Master API

A RESTful backend API for task tracking and team collaboration built with Node.js, Express, and MongoDB.

## Features

- **User Authentication**: Register, login, logout with JWT-based authentication
- **Task Management**: Create, update, delete, and search tasks with filtering and sorting
- **Team Collaboration**: Create teams, invite members, assign tasks within teams
- **Comments & Attachments**: Add comments and file attachments to tasks
- **Real-time Notifications**: WebSocket-based real-time updates for task assignments and changes
- **AI Integration**: Generate task descriptions using OpenAI (optional)

## Prerequisites

- Node.js 18+
- MongoDB (local via Docker or MongoDB Atlas)
- Docker (optional, for local MongoDB)

## Getting Started

### 1. Clone and Install

```bash
npm install
```

### 2. Environment Setup

Copy `.env.example` to `.env` and update the values:

```bash
cp .env.example .env
```

### 3. Start MongoDB (using Docker)

```bash
docker-compose up -d
```

### 4. Run the Server

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

The API will be available at `http://localhost:3000`

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login user |
| GET | `/api/auth/profile` | Get current user profile |
| PUT | `/api/auth/profile` | Update profile |
| PUT | `/api/auth/password` | Change password |
| POST | `/api/auth/logout` | Logout |

### Tasks
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/tasks` | Create task |
| GET | `/api/tasks` | Get all tasks (with filters) |
| GET | `/api/tasks/my-tasks` | Get tasks assigned to me |
| GET | `/api/tasks/:id` | Get task by ID |
| PUT | `/api/tasks/:id` | Update task |
| DELETE | `/api/tasks/:id` | Delete task |
| PATCH | `/api/tasks/:id/complete` | Mark task as complete |

### Teams
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/teams` | Create team |
| GET | `/api/teams` | Get my teams |
| GET | `/api/teams/:id` | Get team details |
| PUT | `/api/teams/:id` | Update team |
| DELETE | `/api/teams/:id` | Delete team |
| POST | `/api/teams/:id/invite` | Invite member |
| POST | `/api/teams/join/:token` | Accept invitation |
| DELETE | `/api/teams/:id/members/:memberId` | Remove member |
| POST | `/api/teams/:id/leave` | Leave team |
| GET | `/api/teams/:id/tasks` | Get team tasks |

### Comments
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/comments/tasks/:taskId` | Add comment |
| GET | `/api/comments/tasks/:taskId` | Get task comments |
| PUT | `/api/comments/:id` | Update comment |
| DELETE | `/api/comments/:id` | Delete comment |

### Attachments
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/attachments` | Upload file |
| GET | `/api/attachments/tasks/:taskId` | Get task attachments |
| GET | `/api/attachments/:id/download` | Download file |
| DELETE | `/api/attachments/:id` | Delete attachment |

### Notifications
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notifications` | Get notifications |
| PUT | `/api/notifications/:id/read` | Mark as read |
| PUT | `/api/notifications/read-all` | Mark all as read |
| DELETE | `/api/notifications/:id` | Delete notification |

### AI (Optional)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ai/generate-description` | Generate task description |
| POST | `/api/ai/summarize-task` | Summarize task |

## Query Parameters

### Task Filtering
- `status`: Filter by status (open, in-progress, review, completed, cancelled)
- `priority`: Filter by priority (low, medium, high, urgent)
- `assignee`: Filter by assignee ID
- `team`: Filter by team ID
- `assignedToMe`: Set to 'true' for tasks assigned to current user
- `createdByMe`: Set to 'true' for tasks created by current user
- `search`: Full-text search in title and description

### Pagination
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10, max: 100)

### Sorting
- `sortBy`: Field to sort by (createdAt, dueDate, priority, etc.)
- `order`: Sort order (asc, desc)

## WebSocket Events

Connect with your JWT token:
```javascript
const socket = io('http://localhost:3000', {
  auth: { token: 'your-jwt-token' }
});
```

### Events
- `task:assigned` - When a task is assigned to you
- `task:updated` - When a task you're watching is updated
- `task:completed` - When a task is completed
- `comment:created` - New comment on a task
- `comment:updated` - Comment edited
- `comment:deleted` - Comment deleted
- `notification:new` - New notification received
- `team:member-joined` - New member joined team

### Rooms
- Join task room: `socket.emit('task:join', taskId)`
- Leave task room: `socket.emit('task:leave', taskId)`
- Join team room: `socket.emit('team:join', teamId)`
- Leave team room: `socket.emit('team:leave', teamId)`

## Project Structure

```
src/
├── app.js                 # Express app setup
├── config/
│   └── database.js        # MongoDB connection
├── controllers/           # Route handlers
├── middleware/            # Express middleware
├── models/                # Mongoose models
├── routes/                # API routes
├── services/              # Business logic
├── shared/
│   ├── constants/         # App constants
│   └── enums/             # Enumerations
├── sockets/               # Socket.IO handlers
└── validators/            # Request validators
```

## License

ISC
