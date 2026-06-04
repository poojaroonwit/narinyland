
# Narinyland Virtual Pet 🌸

A romantic, AI-powered virtual companion for couples that reacts to your presence and expressions in real-time. Build your love story together with an interactive virtual pet, shared memories, timeline events, and personalized experiences.


## ✨ Features

### 🐾 **Virtual Pet Companion**
- AI-powered virtual pet that responds to emotions and interactions
- Multiple pet types with customizable appearances
- Real-time emotional reactions and messages
- 3D graphics with React Three Fiber

### 💕 **Relationship Management**
- Shared timeline for relationship milestones
- Love letters with scheduled delivery
- Interactive love tree that grows with your relationship
- Memory gallery with photo/video support
- Love coupons system for romantic gestures

### 🎵 **Multimedia Experience**
- Integrated music playlist
- Support for photos and videos in memories
- Customizable gallery layouts (carousel, grid)
- Instagram integration for automatic photo imports

### 📱 **Modern Web Experience**
- Progressive Web App (PWA) support
- Responsive design for mobile and desktop
- Real-time updates with WebSocket connections
- Cloud storage through UniBox for media files

### 🎮 **Gamification**
- Points and experience system
- Relationship levels and achievements
- Interactive proposal system
- Daily engagement rewards

## 🛠️ Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript
- **Styling**: Tailwind CSS, Framer Motion
- **3D Graphics**: React Three Fiber, Three.js
- **Database**: PostgreSQL with Prisma ORM
- **Storage**: UniBox file storage for media files
- **Cache**: Redis for session management
- **AI**: Google Gemini API for pet interactions
- **Deployment**: Railway, Vercel ready

## 🚀 Quick Start

**Prerequisites:** Node.js 18+, PostgreSQL, Redis

### 1. Clone and Install
```bash
git clone <repository-url>
cd narinyland
npm install
```

### 2. Environment Setup
Create a `.env.local` file with:
```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/narinyland"
DIRECT_URL="postgresql://username:password@localhost:5432/narinyland"

# AI
GEMINI_API_KEY="your-gemini-api-key"

# UniBox storage
UNIBOX_BASE_URL="https://unibox.up.railway.app"
UNIBOX_APP_ID="your-unibox-application-id"
UNIBOX_SESSION_COOKIE="next-auth.session-token=your-unibox-session-cookie"
# Optional: put uploads into a specific UniBox folder
UNIBOX_FOLDER_ID="your-unibox-folder-id"
# Optional: map Narinyland folder names to UniBox folder IDs
UNIBOX_FOLDER_IDS="gallery=folder_id,timeline=folder_id,letters=folder_id"

# Legacy media compatibility
# Production denies unscoped legacy media unless this is explicitly enabled.
ALLOW_LEGACY_UNSCOPED_MEDIA="false"

# Redis (optional)
REDIS_URL="redis://localhost:6379"
```

### 3. Database Setup
```bash
# Generate Prisma client
npm run db:generate

# Push database schema
npm run db:push

# (Optional) Seed with sample data
npm run db:seed

# (Optional) Dry-run legacy UniBox key scoping before disabling compatibility
npm run db:scope-legacy-media

# Apply legacy UniBox key scoping after reviewing the dry-run output
npm run db:scope-legacy-media -- --write
```

### 4. Run the App
```bash
npm run dev
```

Visit `http://localhost:3000` to see your app.

## 📁 Project Structure

```
narinyland/
├── README.md               # Project documentation
├── ARCHITECTURE.md         # Technical architecture overview
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Main page
├── components/            # React components
│   ├── Timeline/          # Timeline component
│   ├── LoveTree/          # Interactive love tree
│   ├── MemoryFrame/       # Memory gallery
│   └── ...                # Other UI components
├── lib/                   # Utility libraries
├── prisma/               # Database schema and migrations
├── public/               # Static assets
├── scripts/              # Migration and utility scripts
├── services/             # API service layer
└── types.ts              # TypeScript type definitions
```

## 🎯 Key Components

### Virtual Pet System
- Real-time emotion detection
- AI-powered responses using Gemini API
- 3D rendering with Three.js
- Customizable pet types and behaviors

### Timeline & Memories
- Chronological relationship events
- Media-rich memory storage
- Multiple layout options
- Social media integration

### Love Letters & Coupons
- Scheduled message delivery
- Interactive coupon system
- Points-based rewards
- Personalized content

## 🔧 Configuration

The app uses a centralized configuration system via the `AppConfig` model. Key settings include:

- **Pet Settings**: Type, appearance, behavior
- **Gallery**: Layout, source (manual/Instagram)
- **Timeline**: Display modes, zoom levels
- **PWA**: App name, theme colors, icons
- **Music**: Playlist management

## 📦 Database Schema

The app uses PostgreSQL with the following main models:
- `AppConfig` - Application settings
- `Partner` - User profiles and points
- `TimelineEvent` - Relationship milestones
- `Memory` - Shared photos and videos
- `LoveLetter` - Scheduled messages
- `Coupon` - Reward system
- `LoveStats` - Gamification data

## 🏗️ Architecture

For detailed technical architecture, system design, and data flow information, see the **[Architecture Overview](./ARCHITECTURE.md)** document.

### System Layers
- **Frontend**: React components with 3D graphics and animations
- **API**: RESTful routes with TypeScript validation
- **Services**: Business logic and external integrations
- **Data**: PostgreSQL database with Prisma ORM
- **Storage**: UniBox for media files
- **AI**: Google Gemini API for pet interactions

## 🚀 Deployment

### Railway (Recommended)
1. Connect your GitHub repository
2. Set environment variables in Railway dashboard
3. Deploy automatically

### Vercel
1. Install Vercel CLI
2. Run `vercel` in project root
3. Configure environment variables

### Docker
```bash
docker build -t narinyland .
docker run -p 3000:3000 narinyland
```

## 🎨 Customization

### Adding New Pet Types
1. Update `petType` in AppConfig schema
2. Add pet models to `components/pets/`
3. Configure AI responses in API routes

### Custom Themes
1. Modify `tailwind.config.ts`
2. Update CSS variables in `globals.css`
3. Adjust PWA theme colors in config

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 💝 Support

For questions or support:
- Create an issue in the GitHub repository
- Check the documentation in `/docs`
- Review the API routes in `app/api/`

---

Built with ❤️ for couples everywhere
