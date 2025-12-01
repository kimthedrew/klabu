# 🚚 Delivery Person Flow - Complete Guide

## Overview
This document explains how delivery persons receive and accept delivery orders in the Klabu platform.

---

## 🔄 Complete Delivery Flow

### **1. Delivery Person Registration**
- Visit `/app` and click "Register as Delivery Person"
- Fill in details: Name, Email, Phone, ID Number, Password
- Account status: **Pending Approval** ⏳

### **2. Admin Approval**
- Admin reviews delivery person at `/admin/delivery-persons`
- Admin clicks "Approve" button
- Delivery person can now go online

### **3. Going Online (Option 3 - Hybrid Approach)**

#### **Initial State**
- By default, delivery persons are `isActive: false` (offline)
- They cannot receive delivery requests while offline

#### **Toggle Active Status**
- Login and go to delivery dashboard (`/dashboard/delivery`)
- See status card showing current state (online/offline)
- Click **"Go Online"** button to start receiving requests
- Click **"Go Offline"** to stop receiving requests

#### **Auto-Features**
- Cannot toggle online if not approved by admin
- WebSocket connection established when online
- Real-time notifications for new deliveries

---

## 📱 Receiving Delivery Requests

### **Step 1: Stall Owner Marks Order Ready**
When a stall owner marks an order as "Ready for Delivery":

```javascript
Order Status: CONFIRMED → READY_FOR_DELIVERY
```

### **Step 2: System Finds Active Delivery Persons**
Backend service queries:
```javascript
WHERE isActive = true AND isApproved = true
ORDER BY rating DESC
```

### **Step 3: Assignment Process Begins**
- System assigns to **highest-rated** available delivery person first
- Creates `DeliveryAssignment` record with:
  - Status: `PENDING`
  - Expires in: **90 seconds**

### **Step 4: Real-Time Notification Sent**

#### **WebSocket Event:**
```javascript
io.to(`delivery-${deliveryPersonId}`).emit('delivery-assignment', {
  assignmentId: "...",
  orderId: "...",
  customerName: "John Doe",
  deliveryLocation: "Building A, Room 204",
  totalAmount: 850,
  deliveryFee: 100,
  stallName: "Mama Njeri's Kitchen",
  expiresAt: "2025-10-15T12:30:00Z"
});
```

#### **UI Updates:**
- 🔔 **Toast notification** appears: "New delivery from [Stall]! KES [Fee] delivery fee"
- **Pending Assignments section** shows new request
- **Live countdown timer** starts (1:30... 1:29... 1:28...)

---

## ⏱️ Countdown Timer Features

### **Timer Display**
- Shows: `1:30` (minutes:seconds)
- Updates every second in real-time
- Color coding:
  - **Orange** (90-31 seconds): Normal
  - **Red + pulsing** (30-0 seconds): Urgent!
  - **Gray** (expired): Cannot accept

### **Assignment Card Shows:**
- Customer name & phone
- Delivery location & room number
- Stall name
- Order total & delivery fee
- **Live countdown timer**
- Accept/Reject buttons

---

## ✅ Accepting a Delivery

### **Delivery Person Clicks "Accept"**
1. Frontend calls: `POST /api/deliveries/accept-assignment`
2. Backend validates:
   - Assignment still pending
   - Not expired
   - Delivery person is active & approved
3. Updates:
   ```javascript
   DeliveryAssignment → status: ACCEPTED
   Order → deliveryPersonId: [assigned]
   Order → deliveryStatus: ASSIGNED
   Creates Delivery record
   ```
4. Clears timeout timer for this assignment
5. **Notifies stall owner** via WebSocket:
   ```javascript
   io.to(`stall-${stallId}`).emit('delivery-accepted', {
     deliveryPerson: { name, phone, rating }
   });
   ```

### **UI Updates:**
- Assignment removed from "Pending" section
- Appears in "Your Deliveries" section
- Status: `ASSIGNED`
- Shows pickup and delivery details

---

## ❌ Rejecting a Delivery

### **Delivery Person Clicks "Reject"**
1. Prompted for rejection reason
2. Frontend calls: `POST /api/deliveries/reject-assignment`
3. Backend:
   - Marks assignment as `REJECTED`
   - Records rejection reason
   - Clears timeout timer
4. **Automatically moves to next delivery person:**
   - Excludes person who rejected
   - Assigns to next highest-rated person
   - New 90-second timer starts

---

## ⏰ Assignment Timeout (No Response)

### **If 90 Seconds Pass Without Response:**
1. Backend automatically:
   - Marks assignment as `EXPIRED`
   - Moves to next delivery person
   - New assignment created with fresh 90-second timer

2. Frontend:
   - Timer shows "EXPIRED"
   - Accept/Reject buttons disabled
   - Auto-refreshes to remove expired assignment

---

## 🚗 Delivery Lifecycle After Acceptance

### **Status Progression:**

1. **ASSIGNED** (Initial)
   - Delivery person accepted
   - Waiting to pick up from stall
   - Button: "Mark as Picked Up"

2. **PICKED_UP** (In Transit)
   - Delivery person collected order from stall
   - En route to customer
   - Button: "Mark as Delivered"

3. **DELIVERED** (Complete)
   - Order delivered to customer
   - Delivery person stats updated
   - Total deliveries incremented

---

## 📊 Dashboard Stats

The delivery dashboard shows:
- **Total Deliveries**: All-time count
- **Rating**: Current rating (out of 5.0)
- **Completed Today**: Deliveries delivered today
- **Active Deliveries**: Currently in progress

---

## 🔔 Real-Time Notifications

### **Events Delivery Person Receives:**

1. **`delivery-assignment`**
   - New delivery request
   - Shows toast notification
   - Updates pending assignments list

2. **`delivery-picked-up`**
   - Stall owner confirmed pickup
   - Updates delivery status

3. **Auto-updates:**
   - When assignment expires
   - When another delivery person accepts

---

## 🎯 Key Features

### **For Delivery Persons:**
- ✅ Full control over online/offline status
- ✅ See all order details before accepting
- ✅ 90-second window to decide
- ✅ Live countdown timer
- ✅ Can reject with reason
- ✅ Real-time push notifications
- ✅ Track earnings (delivery fees)
- ✅ Build rating/reputation

### **For Stall Owners:**
- ✅ Automatic assignment to best-rated delivery persons
- ✅ No manual selection needed
- ✅ Backup options if first person rejects
- ✅ Real-time status updates
- ✅ See delivery person details (name, phone, rating)

### **System Intelligence:**
- ✅ Priority to higher-rated delivery persons
- ✅ Automatic fallback to next person
- ✅ Prevents double-assignment
- ✅ Time-bounded assignments
- ✅ Tracks rejection patterns

---

## 🔧 Technical Implementation

### **Backend Routes:**
- `PATCH /api/deliveries/toggle-status` - Go online/offline
- `POST /api/deliveries/accept-assignment` - Accept delivery
- `POST /api/deliveries/reject-assignment` - Reject with reason
- `GET /api/deliveries/pending-assignments` - Get active requests
- `GET /api/deliveries/my-deliveries` - Get delivery history
- `GET /api/deliveries/profile` - Get delivery person profile

### **WebSocket Rooms:**
- `delivery-${deliveryPersonId}` - Personal delivery notifications
- `stall-${stallId}` - Stall owner notifications

### **Database Models:**
- `DeliveryPerson` - Profile with isActive, isApproved, rating
- `DeliveryAssignment` - Assignment with status, expiresAt
- `Delivery` - Active delivery tracking
- `Order` - Order with deliveryPersonId, deliveryStatus

---

## 📱 UI Screenshots / Key Sections

### **Status Toggle Section:**
```
┌─────────────────────────────────────────┐
│ 🚚 Delivery Status                      │
│ You are active and receiving delivery  │
│ requests                        [Go Offline] │
└─────────────────────────────────────────┘
```

### **Pending Assignment Card:**
```
┌─────────────────────────────────────────┐
│ 🔔 Pending Delivery Requests (1)        │
├─────────────────────────────────────────┤
│ John Doe                    1:25 ⏱️     │
│ 📞 0712345678               PENDING     │
│ 📍 Building A, Room 204                 │
│ From: Mama Njeri's Kitchen              │
│                                         │
│ Order Total: KES 850                    │
│ Delivery Fee: KES 100                   │
│                                         │
│ [✅ Accept Delivery] [❌ Reject]        │
└─────────────────────────────────────────┘
```

---

## 🎉 Summary

**The delivery person system is fully functional with:**
1. ✅ Online/offline toggle (Option 3 - Hybrid)
2. ✅ Real-time delivery notifications via WebSocket
3. ✅ 90-second countdown timer with auto-refresh
4. ✅ Accept/reject functionality
5. ✅ Automatic cascading to next delivery person
6. ✅ Complete delivery lifecycle tracking
7. ✅ Admin approval workflow
8. ✅ Rating-based prioritization

**Everything is connected and working!** 🚀

