# Klabu - UON Food Delivery Platform

A comprehensive food delivery platform designed specifically for the University of Nairobi's Klabu area. This platform connects students with local food stalls and delivery persons, making it easy to order food and get it delivered to hostels.

## 🚀 Features

### For Students (Buyers)
- **No Registration Required**: Students can browse and order food without creating accounts
- **Stall Discovery**: Search for stalls by name or food items
- **Menu Browsing**: View detailed menus with prices and descriptions
- **Easy Ordering**: Simple order process with delivery location specification
- **M-Pesa Integration**: Secure payment through M-Pesa with confirmation codes
- **Real-time Updates**: Track order status and delivery progress

### For Stall Owners
- **Stall Registration**: Easy registration with business details and photos
- **Menu Management**: Add, edit, and manage menu items with prices
- **Order Management**: Receive and confirm orders with payment verification
- **Analytics**: Track sales and customer reviews
- **Photo Uploads**: Showcase stall and food photos to build trust

### For Delivery Persons
- **Flexible Work**: Work when you want with active/inactive status
- **Earning Opportunities**: Earn money per delivery
- **Rating System**: Build reputation through customer reviews
- **Real-time Notifications**: Get notified of delivery opportunities
- **Performance Tracking**: Monitor delivery stats and ratings

### For Administrators
- **Dashboard**: Comprehensive admin dashboard with analytics
- **Order Management**: Monitor all orders and deliveries
- **User Management**: Manage stalls and delivery persons
- **Revenue Tracking**: Monitor platform revenue and transactions
- **M-Pesa Confirmations**: Handle delivery fee confirmations

## 🛠️ Technology Stack

### Backend
- **Node.js** with **Express.js**
- **TypeScript** for type safety
- **Prisma** as ORM with PostgreSQL
- **JWT** for authentication
- **Socket.io** for real-time notifications
- **Joi** for request validation

### Frontend
- **Next.js** with **React**
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **Axios** for API calls
- **Socket.io Client** for real-time updates

### Database
- **PostgreSQL** for data persistence
- **Prisma** for database management

## 📋 Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database
- npm or yarn package manager

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone <repository-url>
cd klabu
```

### 2. Backend Setup
```bash
cd backend

# Install dependencies
npm install

# Copy environment file
cp env.example .env

# Update .env with your database credentials
# DATABASE_URL="postgresql://username:password@localhost:5432/klabu_db"
# JWT_SECRET="your-super-secret-jwt-key"

# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:push

# Start the backend server
npm run dev
```

### 3. Frontend Setup
```bash
cd web

# Install dependencies
npm install

# Create environment file
cp .env.local.example .env.local

# Update .env.local with your backend URL
# NEXT_PUBLIC_API_URL=http://localhost:5000

# Start the frontend development server
npm run dev
```

### 4. Environment Variables

**Frontend (.env.local)**
```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:5000
```

> **Note**: For production deployment, update `NEXT_PUBLIC_API_URL` to your production backend URL.

### 5. Access the Application
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## 📁 Project Structure

```
klabu/
├── backend/                 # Backend API server
│   ├── src/
│   │   ├── controllers/     # Route controllers
│   │   ├── routes/          # API routes
│   │   ├── utils/           # Utility functions
│   │   └── index.ts         # Main server file
│   ├── prisma/
│   │   ├── schema.prisma    # Database schema
│   │   └── seed.ts          # Database seeding
│   └── package.json
├── web/                     # Frontend Next.js app
│   ├── pages/               # Next.js pages
│   ├── components/          # React components
│   └── package.json
└── README.md
```

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - Register stall owner or delivery person
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user profile

### Stalls
- `GET /api/stalls` - Get all active stalls (public)
- `GET /api/stalls/:id` - Get stall details (public)
- `POST /api/stalls` - Create stall (stall owner only)
- `PUT /api/stalls/:id` - Update stall (stall owner only)
- `POST /api/stalls/:id/menu` - Add menu item (stall owner only)

### Orders
- `POST /api/orders` - Create order (public)
- `GET /api/orders/:id` - Get order details (public)
- `POST /api/orders/:id/confirm-payment` - Confirm payment (stall owner)
- `GET /api/orders/stall/my-orders` - Get stall orders (stall owner)

### Deliveries
- `PATCH /api/deliveries/toggle-status` - Toggle delivery status (delivery person)
- `POST /api/deliveries/accept` - Accept delivery (delivery person)
- `PATCH /api/deliveries/:id/status` - Update delivery status (delivery person)

### Admin
- `GET /api/admin/dashboard` - Get dashboard stats (admin)
- `GET /api/admin/orders` - Get all orders (admin)
- `GET /api/admin/stalls` - Get all stalls (admin)

## 💡 Key Features Implementation

### Order Flow
1. **Student browses stalls** → No authentication required
2. **Selects stall and items** → Views menu and prices
3. **Places order** → Provides delivery location and contact
4. **Stall owner confirms payment** → Verifies M-Pesa code
5. **System assigns delivery person** → Random selection with 30s countdown
6. **Delivery person accepts** → Picks up and delivers food
7. **Order completed** → Reviews and ratings

### Delivery Assignment Algorithm
- Random selection from active delivery persons
- 30-second countdown for acceptance
- Automatic reassignment if not accepted
- Rating-based priority for future assignments

### Payment System
- M-Pesa integration for food payments
- Delivery fees handled separately
- Stall owners pay delivery fees to platform
- Admin manages delivery fee confirmations

## 🔒 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Input validation with Joi
- Role-based access control
- CORS protection
- Helmet security headers

## 📱 Real-time Features

- Socket.io for instant notifications
- Order status updates
- Delivery person notifications
- Stall owner alerts
- Real-time order tracking

## 🎨 UI/UX Features

- **Responsive Design**: Works on all devices
- **Modern Interface**: Clean and intuitive design
- **Fast Loading**: Optimized for performance
- **Accessibility**: User-friendly for all students
- **Mobile-First**: Designed for mobile usage

## 🚀 Deployment

### Backend Deployment
1. Set up PostgreSQL database
2. Configure environment variables
3. Run database migrations
4. Deploy to your preferred platform (Heroku, DigitalOcean, etc.)

### Frontend Deployment
1. Build the Next.js application
2. Deploy to Vercel, Netlify, or your preferred platform
3. Configure environment variables

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

## 🔮 Future Enhancements

- [ ] Mobile app development
- [ ] Advanced analytics dashboard
- [ ] Push notifications
- [ ] GPS tracking for deliveries
- [ ] Multi-language support
- [ ] Integration with university systems
- [ ] Loyalty programs
- [ ] Advanced payment options

---

**Built with ❤️ for the UON community**





# klabu
