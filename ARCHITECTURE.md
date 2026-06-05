# Narinyland Architecture Overview 🏗️

## System Architecture

Narinyland is a modern full-stack web application built with Next.js 16, featuring a sophisticated relationship management system with AI-powered virtual pets. The architecture follows a layered approach with clear separation of concerns.

### High-Level Architecture Diagram

```mermaid
graph TB
    subgraph "Frontend Layer"
        A[React Components] --> B[3D Graphics]
        A --> C[State Management]
        A --> D[UI Components]
    end
    
    subgraph "API Layer"
        E[RESTful Routes] --> F[File Upload]
        E --> G[AI Integration]
        E --> H[Authentication]
    end
    
    subgraph "Service Layer"
        I[Business Logic] --> J[Data Validation]
        I --> K[External APIs]
    end
    
    subgraph "Data Layer"
        L[PostgreSQL] --> M[Prisma ORM]
        N[Redis Cache] --> O[Session Management]
        P[UniBox] --> Q[Media Storage]
    end
    
    A --> E
    E --> I
    I --> L
    I --> N
    I --> P
```

### System Layers Diagram

```mermaid
graph LR
    subgraph "Client Side"
        A1[Browser] --> A2[React App]
        A2 --> A2a[Components]
        A2 --> A2b[State Management]
        A2 --> A2c[3D Graphics]
    end
    
    subgraph "Server Side"
        B1[Next.js Server] --> B2[API Routes]
        B2 --> B2a[Config API]
        B2 --> B2b[Timeline API]
        B2 --> B2c[Upload API]
        B2 --> B2d[AI Integration]
    end
    
    subgraph "Data & Storage"
        C1[PostgreSQL] --> C2[Prisma ORM]
        C3[Redis Cache]
        C4[UniBox]
        C5[Gemini AI]
    end
    
    A2 -.->|HTTP Requests| B1
    B2 -.->|Queries| C1
    B2 -.->|Cache| C3
    B2 -.->|Files| C4
    B2 -.->|AI Calls| C5
```

## Core Components

### 🎯 Frontend Architecture

#### Component Hierarchy
```
app/
├── layout.tsx              # Root layout with PWA configuration
├── page.tsx                # Main application container
└── api/                    # API routes (server-side)

components/
├── Timeline/               # Timeline display and interactions
├── LoveTree/               # 3D interactive love tree
├── MemoryFrame/            # Photo/video gallery
├── LoveCoupons/            # Reward system
├── LoveLetter/             # Scheduled messaging
├── ProposalScreen/         # Interactive proposal
├── EditDrawer/             # Configuration panel
└── OptimizedImage/         # Image optimization
```

#### State Management
- **Local State**: React hooks for component-level state
- **Global State**: Server state via API calls
- **Real-time Updates**: Polling and event-driven updates
- **Persistence**: Database-backed configuration

#### UI Framework
- **Styling**: Tailwind CSS with custom themes
- **Animations**: Framer Motion for smooth transitions
- **3D Graphics**: React Three Fiber + Three.js
- **Responsive**: Mobile-first design approach

### 🔌 API Architecture

#### Route Structure
```
/api/
├── config/                 # App configuration CRUD
├── timeline/              # Timeline events management
├── memories/              # Photo/video uploads and retrieval
├── letters/               # Love letters CRUD
├── coupons/               # Reward system
├── stats/                 # Gamification data
├── upload/                # File upload handling
├── serve-image/           # Optimized image serving
├── instagram/             # Social media integration
└── cleanup/               # Maintenance operations
```

#### API Design Principles
- **RESTful**: Standard HTTP methods and status codes
- **TypeScript**: Full type safety across API boundaries
- **Error Handling**: Consistent error responses
- **Validation**: Input validation and sanitization
- **File Handling**: API-mediated uploads with UniBox storage and scoped media keys

### 🗄️ Data Architecture

#### Database Schema Diagram

```mermaid
erDiagram
    AppConfig {
        string id PK
        string appName
        datetime anniversaryDate
        string treeStyle
        string petType
        json pets
        string graphicsQuality
        datetime createdAt
        datetime updatedAt
    }
    
    Partner {
        string id PK
        string partnerId
        string name
        string avatar
        int points
        int lifetimePoints
        string configId FK
    }
    
    TimelineEvent {
        string id PK
        string text
        string type
        string location
        datetime timestamp
        string mediaType
        string mediaUrl
        string configId FK
    }
    
    Memory {
        string id PK
        string url
        string s3Key
        string privacy
        string caption
        int sortOrder
        datetime createdAt
    }
    
    LoveLetter {
        string id PK
        string content
        string fromId FK
        string folder
        datetime unlockDate
        boolean isRead
        datetime readAt
        string mediaUrl
    }
    
    Coupon {
        string id PK
        string title
        string emoji
        string desc
        string color
        int points
        string forPartner
        boolean isRedeemed
        datetime redeemedAt
        string configId FK
    }
    
    LoveStats {
        string id PK
        int xp
        int level
        int leaves
        int points
        datetime createdAt
    }
    
    AppConfig ||--o{ Partner : "has"
    AppConfig ||--o{ TimelineEvent : "contains"
    AppConfig ||--o{ Coupon : "provides"
    Partner ||--o{ LoveLetter : "sends"
```

#### Data Flow Diagram

```mermaid
flowchart TD
    A[User Interaction] --> B[React Component]
    B --> C[API Call]
    C --> D[Next.js Route]
    D --> E[Service Layer]
    E --> F[Business Logic]
    
    F --> G[Database Operations]
    F --> H[External APIs]
    F --> I[File Operations]
    
    G --> J[PostgreSQL]
    H --> K[Gemini AI]
    H --> L[UniBox]
    I --> M[Redis Cache]
    
    J --> N[Response Processing]
    K --> N
    L --> N
    M --> N
    
    N --> O[API Response]
    O --> P[State Update]
    P --> Q[UI Re-render]
```

#### Storage Strategy
- **Database**: PostgreSQL for structured data
- **File Storage**: UniBox for new media files, with legacy S3-compatible fallback reads
- **Cache**: Redis for session and temporary data
- **Media Serving**: `/api/serve-image` proxies access-controlled media

### 🤖 AI Integration

#### Virtual Pet System
```
User Input → Emotion Detection → Gemini API → Response Generation → Pet Animation
```

#### AI Components
- **Emotion Detection**: Camera-based facial recognition
- **Response Generation**: Google Gemini API
- **Animation System**: 3D model manipulation
- **Behavior Logic**: State machine for pet emotions

## Technology Stack

### Frontend
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **UI Library**: React 19
- **Styling**: Tailwind CSS
- **3D Graphics**: React Three Fiber, Three.js
- **Animations**: Framer Motion
- **PWA**: Next.js PWA features

### Backend
- **Runtime**: Node.js
- **Framework**: Next.js API Routes
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Cache**: Redis
- **File Storage**: UniBox
- **AI**: Google Gemini API

### Development
- **Package Manager**: npm
- **Code Quality**: ESLint, TypeScript
- **Deployment**: Railway, Vercel ready
- **Containerization**: Docker

## Data Flow

### Typical Request Flow
```
1. User Interaction (React Component)
2. API Call (Next.js Route)
3. Business Logic (Service Layer)
4. Database Operation (Prisma)
5. External API (AI/UniBox)
6. Response Processing
7. UI Update (React State)
```

### Real-time Features
- **Pet Emotions**: Polling-based updates
- **Timeline Events**: Server-sent events
- **Media Upload**: Progress tracking
- **Configuration**: Live updates

## Security Architecture

### Authentication & Authorization
- **API Keys**: Gemini API integration
- **File Upload**: Type validation and size limits
- **Database**: Parameterized queries via Prisma
- **CORS**: Configured for production domains

### Data Protection
- **Environment Variables**: Sensitive configuration
- **Media Security**: Config-scoped storage keys plus `/api/serve-image` membership checks
- **Input Validation**: Type checking and sanitization
- **Error Handling**: No sensitive data exposure

## Performance Optimization

### Frontend Optimization
- **Code Splitting**: Dynamic imports for components
- **Image Optimization**: Next.js Image component
- **3D Performance**: LOD (Level of Detail) management
- **Bundle Size**: Tree shaking and minification

### Backend Optimization
- **Database Indexing**: Optimized query performance
- **Caching Strategy**: Redis for frequent queries
- **File Delivery**: Proxied media responses with cache headers and range support
- **API Response**: Efficient data structures

### Monitoring & Analytics
- **Error Tracking**: Built-in error boundaries
- **Performance Metrics**: Component render times
- **User Analytics**: Interaction tracking
- **System Health**: Database and API monitoring

### Deployment Architecture

#### Production Environment Diagram

```mermaid
graph TB
    subgraph "Client"
        A[Web Browser] --> B[Mobile App]
        A --> C[Desktop]
    end
    
    subgraph "CDN / Frontend"
        D[Vercel CDN] --> E[Static Assets]
        D --> F[Next.js App]
    end
    
    subgraph "Backend Services"
        G[Railway Server] --> H[API Routes]
        G --> I[Server Functions]
    end
    
    subgraph "Database & Storage"
        J[PostgreSQL] --> K[Prisma ORM]
        L[Redis Cache]
        M[UniBox Storage]
    end
    
    subgraph "External Services"
        N[Gemini AI API]
        O[Instagram API]
        P[Email Service]
    end
    
    A --> D
    B --> D
    C --> D
    D --> G
    H --> J
    H --> L
    H --> M
    I --> N
    I --> O
    I --> P
```

#### Scalability Architecture

```mermaid
graph LR
    subgraph "Load Balancer"
        A[Load Balancer]
    end
    
    subgraph "Application Servers"
        B[Server 1] --> D[Next.js Instance]
        C[Server 2] --> E[Next.js Instance]
        F[Server N] --> G[Next.js Instance]
    end
    
    subgraph "Database Cluster"
        H[Primary DB] --> I[Read Replica 1]
        H --> J[Read Replica 2]
    end
    
    subgraph "Cache Layer"
        K[Redis Cluster]
    end
    
    subgraph "Storage"
        L[UniBox] --> M[Serve Image Proxy]
    end
    
    A --> B
    A --> C
    A --> F
    D --> H
    E --> H
    G --> H
    D --> K
    E --> K
    G --> K
    D --> L
    E --> L
    G --> L
```

### Scalability Considerations
- **Horizontal Scaling**: Serverless architecture
- **Database Scaling**: Read replicas for heavy queries
- **CDN Distribution**: Global content delivery
- **Load Balancing**: Automatic via platform

## Development Workflow

### Local Development
```
1. Environment Setup (.env.local)
2. Database Setup (Prisma)
3. Development Server (npm run dev)
4. Hot Reloading (Next.js)
5. Database Studio (Prisma Studio)
```

### Code Organization
- **Feature-based**: Components grouped by functionality
- **Shared Logic**: Reusable hooks and utilities
- **Type Safety**: Comprehensive TypeScript coverage
- **Documentation**: Inline comments and README files

## Future Architecture Considerations

### Potential Enhancements
- **Microservices**: Split into specialized services
- **GraphQL**: More efficient data fetching
- **Live Updates**: Add route-level revalidation only if product flows require it
- **Mobile App**: React Native expansion
- **AI Models**: Custom fine-tuned models

### Scalability Plans
- **Multi-tenant**: Support for multiple couples
- **Internationalization**: Multi-language support
- **Advanced Analytics**: ML-based insights
- **Social Features**: Community interactions

---

This architecture document provides a comprehensive overview of the Narinyland system design, serving as a guide for developers, architects, and stakeholders to understand the technical foundation and future evolution of the platform.
