/**
 * Domain-specific sample data templates for demos/previews
 * These provide realistic, industry-relevant data for generated apps
 */

// Real person avatar photos from randomuser.me (consistent based on seed)
// These show actual diverse human faces instead of just initials
const personAvatars = {
  male: [
    "https://randomuser.me/api/portraits/men/1.jpg",
    "https://randomuser.me/api/portraits/men/2.jpg",
    "https://randomuser.me/api/portraits/men/3.jpg",
    "https://randomuser.me/api/portraits/men/4.jpg",
    "https://randomuser.me/api/portraits/men/5.jpg",
    "https://randomuser.me/api/portraits/men/6.jpg",
    "https://randomuser.me/api/portraits/men/7.jpg",
    "https://randomuser.me/api/portraits/men/8.jpg",
  ],
  female: [
    "https://randomuser.me/api/portraits/women/1.jpg",
    "https://randomuser.me/api/portraits/women/2.jpg",
    "https://randomuser.me/api/portraits/women/3.jpg",
    "https://randomuser.me/api/portraits/women/4.jpg",
    "https://randomuser.me/api/portraits/women/5.jpg",
    "https://randomuser.me/api/portraits/women/6.jpg",
    "https://randomuser.me/api/portraits/women/7.jpg",
    "https://randomuser.me/api/portraits/women/8.jpg",
  ],
};

// Helper function to get a person avatar (alternates male/female based on index)
const getPersonAvatar = (index: number, gender?: 'male' | 'female') => {
  const g = gender || (index % 2 === 0 ? 'male' : 'female');
  const avatars = personAvatars[g];
  return avatars[index % avatars.length];
};

// Fallback to initials-based avatar if needed
const avatarUrl = (name: string, color: string) => 
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${color}&color=fff&size=128`;

export const SAMPLE_DATA_TEMPLATES: Record<string, Array<Record<string, unknown>>> = {
  // Property Management
  tenant: [
    { name: "John Smith", email: "john.smith@email.com", phone: "(555) 123-4567", unit: "4B", leaseEnd: "2026-03-15", rent: 1500, status: "active", avatar: getPersonAvatar(0, 'male') },
    { name: "Sarah Johnson", email: "sarah.j@email.com", phone: "(555) 234-5678", unit: "2A", leaseEnd: "2025-08-01", rent: 1200, status: "active", avatar: getPersonAvatar(1, 'female') },
    { name: "Michael Chen", email: "m.chen@email.com", phone: "(555) 345-6789", unit: "3C", leaseEnd: "2026-01-31", rent: 1350, status: "active", avatar: getPersonAvatar(2, 'male') },
    { name: "Emily Rodriguez", email: "emily.r@email.com", phone: "(555) 456-7890", unit: "1A", leaseEnd: "2025-12-15", rent: 1100, status: "active", avatar: getPersonAvatar(3, 'female') },
    { name: "David Kim", email: "d.kim@email.com", phone: "(555) 567-8901", unit: "5D", leaseEnd: "2025-06-30", rent: 1600, status: "expiring", avatar: getPersonAvatar(4, 'male') },
  ],
  property: [
    { name: "Sunset Apartments", address: "123 Sunset Blvd", city: "Los Angeles", units: 12, type: "apartment", yearBuilt: 1985 },
    { name: "Oak Street Duplex", address: "456 Oak Street", city: "Pasadena", units: 2, type: "duplex", yearBuilt: 1972 },
    { name: "Pine Valley Complex", address: "789 Pine Valley Rd", city: "Glendale", units: 24, type: "apartment", yearBuilt: 2010 },
  ],
  unit: [
    { number: "1A", property: "Sunset Apartments", bedrooms: 1, bathrooms: 1, sqft: 650, rent: 1100, status: "occupied" },
    { number: "2A", property: "Sunset Apartments", bedrooms: 2, bathrooms: 1, sqft: 850, rent: 1200, status: "occupied" },
    { number: "3C", property: "Sunset Apartments", bedrooms: 2, bathrooms: 2, sqft: 950, rent: 1350, status: "occupied" },
    { number: "4B", property: "Sunset Apartments", bedrooms: 3, bathrooms: 2, sqft: 1200, rent: 1500, status: "occupied" },
    { number: "5D", property: "Sunset Apartments", bedrooms: 3, bathrooms: 2, sqft: 1250, rent: 1600, status: "occupied" },
    { number: "6A", property: "Sunset Apartments", bedrooms: 1, bathrooms: 1, sqft: 600, rent: 1050, status: "vacant" },
  ],
  lease: [
    { tenant: "John Smith", unit: "4B", startDate: "2025-04-01", endDate: "2026-03-15", monthlyRent: 1500, securityDeposit: 1500, status: "active" },
    { tenant: "Sarah Johnson", unit: "2A", startDate: "2024-08-01", endDate: "2025-08-01", monthlyRent: 1200, securityDeposit: 1200, status: "active" },
    { tenant: "David Kim", unit: "5D", startDate: "2024-07-01", endDate: "2025-06-30", monthlyRent: 1600, securityDeposit: 1600, status: "expiring" },
  ],
  rentPayment: [
    { tenant: "John Smith", amount: 1500, dueDate: "2025-02-01", paidDate: "2025-01-28", status: "paid" },
    { tenant: "Sarah Johnson", amount: 1200, dueDate: "2025-02-01", paidDate: "2025-02-01", status: "paid" },
    { tenant: "Michael Chen", amount: 1350, dueDate: "2025-02-01", paidDate: null, status: "pending" },
    { tenant: "David Kim", amount: 1600, dueDate: "2025-02-01", paidDate: "2025-02-05", status: "late" },
  ],
  maintenanceRequest: [
    { tenant: "John Smith", unit: "4B", issue: "Leaky faucet in bathroom", priority: "medium", status: "open", createdDate: "2025-01-20" },
    { tenant: "Sarah Johnson", unit: "2A", issue: "AC not cooling properly", priority: "high", status: "in_progress", createdDate: "2025-01-18" },
    { tenant: "Emily Rodriguez", unit: "1A", issue: "Replace smoke detector battery", priority: "low", status: "completed", createdDate: "2025-01-10" },
  ],

  // Gym / Fitness
  member: [
    { name: "Emily Davis", email: "emily.d@email.com", phone: "(555) 111-2222", plan: "Premium", joinDate: "2025-01-15", status: "active", avatar: getPersonAvatar(0, 'female') },
    { name: "Mike Wilson", email: "mike.w@email.com", phone: "(555) 222-3333", plan: "Basic", joinDate: "2025-06-20", status: "active", avatar: getPersonAvatar(1, 'male') },
    { name: "Jessica Taylor", email: "jess.t@email.com", phone: "(555) 333-4444", plan: "Premium", joinDate: "2024-09-01", status: "active", avatar: getPersonAvatar(2, 'female') },
    { name: "Chris Anderson", email: "chris.a@email.com", phone: "(555) 444-5555", plan: "Family", joinDate: "2024-11-15", status: "active", avatar: getPersonAvatar(3, 'male') },
    { name: "Amanda White", email: "amanda.w@email.com", phone: "(555) 555-6666", plan: "Basic", joinDate: "2025-01-01", status: "frozen", avatar: getPersonAvatar(4, 'female') },
  ],
  membershipPlan: [
    { name: "Basic", price: 29.99, billingCycle: "monthly", features: ["Gym access", "Locker room"], maxClasses: 0 },
    { name: "Premium", price: 59.99, billingCycle: "monthly", features: ["Gym access", "Locker room", "Unlimited classes", "Personal training discount"], maxClasses: -1 },
    { name: "Family", price: 99.99, billingCycle: "monthly", features: ["Gym access for 4", "Locker room", "5 classes/month"], maxClasses: 5 },
  ],
  membership: [
    { member: "Emily Davis", plan: "Premium", startDate: "2025-01-15", endDate: "2026-01-15", status: "active", autoRenew: true },
    { member: "Mike Wilson", plan: "Basic", startDate: "2025-06-20", endDate: "2026-06-20", status: "active", autoRenew: true },
    { member: "Amanda White", plan: "Basic", startDate: "2025-01-01", endDate: "2026-01-01", status: "frozen", autoRenew: false },
  ],
  fitnessClass: [
    { name: "Morning Yoga", instructor: "Sarah Lee", duration: 60, capacity: 20, category: "yoga" },
    { name: "HIIT Blast", instructor: "Mike Johnson", duration: 45, capacity: 15, category: "cardio" },
    { name: "Spin Class", instructor: "Chris Martin", duration: 50, capacity: 25, category: "cycling" },
    { name: "Strength Training", instructor: "Alex Chen", duration: 60, capacity: 12, category: "weights" },
  ],
  classSchedule: [
    { class: "Morning Yoga", dayOfWeek: "Monday", startTime: "07:00", room: "Studio A" },
    { class: "Morning Yoga", dayOfWeek: "Wednesday", startTime: "07:00", room: "Studio A" },
    { class: "HIIT Blast", dayOfWeek: "Tuesday", startTime: "18:00", room: "Main Floor" },
    { class: "Spin Class", dayOfWeek: "Thursday", startTime: "17:30", room: "Cycling Room" },
  ],
  attendance: [
    { member: "Emily Davis", class: "Morning Yoga", date: "2025-01-20", checkedIn: true },
    { member: "Jessica Taylor", class: "Morning Yoga", date: "2025-01-20", checkedIn: true },
    { member: "Emily Davis", class: "HIIT Blast", date: "2025-01-21", checkedIn: true },
  ],

  // Tutoring
  student: [
    { name: "Alex Chen", email: "alex.parent@email.com", phone: "(555) 777-8888", gradeLevel: "10th", subjects: ["Math", "Physics"], status: "active", avatar: getPersonAvatar(5, 'male') },
    { name: "Olivia Brown", email: "brown.family@email.com", phone: "(555) 888-9999", gradeLevel: "8th", subjects: ["Science", "English"], status: "active", avatar: getPersonAvatar(6, 'female') },
    { name: "Ethan Martinez", email: "martinez.home@email.com", phone: "(555) 999-0000", gradeLevel: "11th", subjects: ["SAT Prep", "Math"], status: "active", avatar: getPersonAvatar(7, 'male') },
    { name: "Sophie Lee", email: "lee.parents@email.com", phone: "(555) 000-1111", gradeLevel: "7th", subjects: ["Math"], status: "active", avatar: getPersonAvatar(0, 'female') },
    { name: "Noah Johnson", email: "johnson.fam@email.com", phone: "(555) 112-2334", gradeLevel: "9th", subjects: ["English", "History"], status: "paused", avatar: getPersonAvatar(1, 'male') },
  ],
  lesson: [
    { student: "Alex Chen", subject: "Math", date: "2025-01-22", time: "16:00", duration: 60, status: "scheduled", notes: "Review calculus derivatives" },
    { student: "Alex Chen", subject: "Physics", date: "2025-01-24", time: "16:00", duration: 60, status: "scheduled", notes: "Kinematics problems" },
    { student: "Olivia Brown", subject: "Science", date: "2025-01-23", time: "15:00", duration: 45, status: "scheduled", notes: "Chemistry lab prep" },
    { student: "Ethan Martinez", subject: "SAT Prep", date: "2025-01-25", time: "10:00", duration: 90, status: "scheduled", notes: "Practice test review" },
  ],

  // Restaurant
  guest: [
    { name: "Robert Garcia", email: "r.garcia@email.com", phone: "(555) 321-4321", visits: 12, lastVisit: "2025-01-18", vip: true, avatar: getPersonAvatar(5, 'male') },
    { name: "Linda Martinez", email: "l.martinez@email.com", phone: "(555) 432-5432", visits: 5, lastVisit: "2025-01-15", vip: false, avatar: getPersonAvatar(2, 'female') },
    { name: "James Wilson", email: "j.wilson@email.com", phone: "(555) 543-6543", visits: 8, lastVisit: "2025-01-20", vip: true, avatar: getPersonAvatar(6, 'male') },
    { name: "Maria Santos", email: "m.santos@email.com", phone: "(555) 654-7654", visits: 3, lastVisit: "2025-01-22", vip: false, avatar: getPersonAvatar(4, 'female') },
    { name: "Kevin O'Brien", email: "k.obrien@email.com", phone: "(555) 765-8765", visits: 15, lastVisit: "2025-01-21", vip: true, avatar: getPersonAvatar(7, 'male') },
  ],
  menuItem: [
    { name: "Grilled Salmon", category: "Entrees", price: 28.99, description: "Atlantic salmon with lemon herb butter", available: true, image: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400&h=300&fit=crop" },
    { name: "Caesar Salad", category: "Starters", price: 12.99, description: "Romaine, parmesan, croutons, house dressing", available: true, image: "https://images.unsplash.com/photo-1546793665-c74683f339c1?w=400&h=300&fit=crop" },
    { name: "Ribeye Steak", category: "Entrees", price: 42.99, description: "12oz prime ribeye, choice of two sides", available: true, image: "https://images.unsplash.com/photo-1600891964092-4316c288032e?w=400&h=300&fit=crop" },
    { name: "Chocolate Lava Cake", category: "Desserts", price: 9.99, description: "Warm chocolate cake with vanilla ice cream", available: true, image: "https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=400&h=300&fit=crop" },
    { name: "Pasta Carbonara", category: "Entrees", price: 22.99, description: "Classic Roman pasta with pancetta and egg", available: true, image: "https://images.unsplash.com/photo-1612874742237-6526221588e3?w=400&h=300&fit=crop" },
    { name: "Bruschetta", category: "Starters", price: 9.99, description: "Toasted bread with fresh tomatoes and basil", available: true, image: "https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?w=400&h=300&fit=crop" },
  ],
  reservation: [
    { name: "Robert Garcia", guest: "Robert Garcia", date: "2025-01-25", time: "19:00", partySize: 4, table: "12", status: "confirmed", notes: "Anniversary dinner" },
    { name: "Linda Martinez", guest: "Linda Martinez", date: "2025-01-25", time: "18:30", partySize: 2, table: "5", status: "confirmed", notes: "" },
    { name: "James Wilson", guest: "James Wilson", date: "2025-01-26", time: "20:00", partySize: 6, table: "VIP1", status: "pending", notes: "Business dinner" },
  ],
  order: [
    { name: "Table 12 - Robert Garcia", table: "12", items: ["Caesar Salad", "Grilled Salmon", "Ribeye Steak"], subtotal: 84.97, tax: 7.22, total: 92.19, status: "served" },
    { name: "Table 5 - Linda Martinez", table: "5", items: ["Caesar Salad", "Chocolate Lava Cake"], subtotal: 22.98, tax: 1.95, total: 24.93, status: "preparing" },
    { name: "Table 8 - James Wilson", table: "8", items: ["Bruschetta", "Pasta Carbonara"], subtotal: 32.98, tax: 2.80, total: 35.78, status: "pending" },
  ],

  // Home Services (Plumber, Electrician, HVAC, etc.)
  homeowner: [
    { name: "Patricia Thompson", email: "p.thompson@email.com", phone: "(555) 654-7654", address: "123 Maple Drive", city: "Springfield", avatar: getPersonAvatar(5, 'female') },
    { name: "William Brown", email: "w.brown@email.com", phone: "(555) 765-8765", address: "456 Oak Avenue", city: "Springfield", avatar: getPersonAvatar(3, 'male') },
    { name: "Jennifer Davis", email: "j.davis@email.com", phone: "(555) 876-9876", address: "789 Pine Street", city: "Riverside", avatar: getPersonAvatar(6, 'female') },
    { name: "Robert Martinez", email: "r.martinez@email.com", phone: "(555) 987-0987", address: "321 Elm Lane", city: "Oakland", avatar: getPersonAvatar(4, 'male') },
    { name: "Susan Chen", email: "s.chen@email.com", phone: "(555) 098-1098", address: "654 Cedar Road", city: "Lakewood", avatar: getPersonAvatar(7, 'female') },
  ],
  serviceJob: [
    { customer: "Patricia Thompson", type: "repair", description: "Fix leaking pipe under kitchen sink", scheduledDate: "2025-01-24", status: "scheduled", estimatedCost: 150 },
    { customer: "William Brown", type: "installation", description: "Install new water heater", scheduledDate: "2025-01-26", status: "scheduled", estimatedCost: 1200 },
    { customer: "Jennifer Davis", type: "maintenance", description: "Annual HVAC inspection", scheduledDate: "2025-01-23", status: "completed", estimatedCost: 99 },
  ],

  // E-commerce
  customer: [
    { name: "Rachel Green", email: "r.green@email.com", phone: "(555) 987-6543", totalOrders: 15, totalSpent: 1250.00, memberSince: "2024-03-15", avatar: getPersonAvatar(0, 'female') },
    { name: "Ross Geller", email: "r.geller@email.com", phone: "(555) 876-5432", totalOrders: 8, totalSpent: 650.00, memberSince: "2024-06-20", avatar: getPersonAvatar(1, 'male') },
    { name: "Monica Bing", email: "m.bing@email.com", phone: "(555) 765-4321", totalOrders: 22, totalSpent: 2100.00, memberSince: "2023-11-01", avatar: getPersonAvatar(3, 'female') },
    { name: "Joey Tribbiani", email: "j.tribbiani@email.com", phone: "(555) 654-3210", totalOrders: 5, totalSpent: 320.00, memberSince: "2025-01-10", avatar: getPersonAvatar(2, 'male') },
    { name: "Phoebe Buffay", email: "p.buffay@email.com", phone: "(555) 543-2109", totalOrders: 12, totalSpent: 890.00, memberSince: "2024-08-05", avatar: getPersonAvatar(4, 'female') },
  ],
  
  // Bakery / Cafe Products
  bakeryItem: [
    { name: "Butter Croissant", sku: "BC-001", price: 3.99, category: "Pastries", stock: 24, status: "active", image: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&h=300&fit=crop" },
    { name: "Sourdough Loaf", sku: "SL-002", price: 6.99, category: "Breads", stock: 15, status: "active", image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=300&fit=crop" },
    { name: "Chocolate Eclair", sku: "CE-003", price: 4.50, category: "Pastries", stock: 18, status: "active", image: "https://images.unsplash.com/photo-1528975604071-b4dc52a2d18c?w=400&h=300&fit=crop" },
    { name: "Red Velvet Cake", sku: "RV-004", price: 32.00, category: "Cakes", stock: 5, status: "active", image: "https://images.unsplash.com/photo-1586788680434-30d324b2d46f?w=400&h=300&fit=crop" },
    { name: "Cinnamon Roll", sku: "CR-005", price: 4.25, category: "Pastries", stock: 20, status: "active", image: "https://images.unsplash.com/photo-1509365465985-25d11c17e812?w=400&h=300&fit=crop" },
    { name: "Blueberry Muffin", sku: "BM-006", price: 3.50, category: "Muffins", stock: 30, status: "active", image: "https://images.unsplash.com/photo-1607958996333-41aef7caefaa?w=400&h=300&fit=crop" },
    { name: "French Baguette", sku: "FB-007", price: 4.99, category: "Breads", stock: 12, status: "active", image: "https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=400&h=300&fit=crop" },
    { name: "Apple Danish", sku: "AD-008", price: 3.75, category: "Pastries", stock: 16, status: "active", image: "https://images.unsplash.com/photo-1550617931-e17a7b70dce2?w=400&h=300&fit=crop" },
  ],
  
  // Generic products (e-commerce fallback)
  product: [
    { name: "Wireless Earbuds Pro", sku: "WEP-001", price: 79.99, category: "Electronics", stock: 45, status: "active", image: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&h=300&fit=crop" },
    { name: "Organic Cotton T-Shirt", sku: "OCT-002", price: 29.99, category: "Apparel", stock: 120, status: "active", image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=300&fit=crop" },
    { name: "Stainless Steel Water Bottle", sku: "SWB-003", price: 24.99, category: "Accessories", stock: 85, status: "active", image: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400&h=300&fit=crop" },
    { name: "Yoga Mat Premium", sku: "YMP-004", price: 49.99, category: "Fitness", stock: 30, status: "active", image: "https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=400&h=300&fit=crop" },
    { name: "Smart Watch Series 5", sku: "SW5-005", price: 299.99, category: "Electronics", stock: 25, status: "active", image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=300&fit=crop" },
  ],

  // Materials / Inventory (for contractors, trades, service businesses)
  material: [
    { name: "Copper Pipe 1/2\"", sku: "CP-050", price: 12.99, category: "Plumbing", stock: 150, unit: "ft", status: "in_stock" },
    { name: "PVC Elbow 90°", sku: "PVC-90", price: 2.49, category: "Plumbing", stock: 200, unit: "each", status: "in_stock" },
    { name: "Wire 12 AWG", sku: "WR-12", price: 0.89, category: "Electrical", stock: 500, unit: "ft", status: "in_stock" },
    { name: "Circuit Breaker 20A", sku: "CB-20", price: 15.99, category: "Electrical", stock: 45, unit: "each", status: "in_stock" },
    { name: "Drywall Sheet 4x8", sku: "DW-48", price: 14.99, category: "Building", stock: 80, unit: "sheet", status: "in_stock" },
    { name: "Joint Compound 5gal", sku: "JC-5G", price: 18.99, category: "Building", stock: 25, unit: "bucket", status: "low_stock" },
  ],
  inventory: [
    { name: "Copper Pipe 1/2\"", sku: "CP-050", price: 12.99, category: "Plumbing", stock: 150, unit: "ft", status: "in_stock" },
    { name: "PVC Elbow 90°", sku: "PVC-90", price: 2.49, category: "Plumbing", stock: 200, unit: "each", status: "in_stock" },
    { name: "Wire 12 AWG", sku: "WR-12", price: 0.89, category: "Electrical", stock: 500, unit: "ft", status: "in_stock" },
    { name: "Circuit Breaker 20A", sku: "CB-20", price: 15.99, category: "Electrical", stock: 45, unit: "each", status: "in_stock" },
    { name: "Drywall Sheet 4x8", sku: "DW-48", price: 14.99, category: "Building", stock: 80, unit: "sheet", status: "in_stock" },
  ],
  item: [
    { name: "Standard Widget", sku: "SW-001", price: 9.99, category: "General", stock: 100, status: "active" },
    { name: "Premium Widget", sku: "PW-002", price: 19.99, category: "General", stock: 50, status: "active" },
    { name: "Basic Component", sku: "BC-003", price: 4.99, category: "Parts", stock: 200, status: "active" },
    { name: "Advanced Module", sku: "AM-004", price: 29.99, category: "Parts", stock: 30, status: "active" },
  ],

  // Mechanic / Auto Repair
  vehicleOwner: [
    { name: "Tom Anderson", email: "t.anderson@email.com", phone: "(555) 111-3333", vehicles: 2, avatar: getPersonAvatar(2, 'male') },
    { name: "Lisa Chen", email: "l.chen@email.com", phone: "(555) 222-4444", vehicles: 1, avatar: getPersonAvatar(3, 'female') },
    { name: "Mark Johnson", email: "m.johnson@email.com", phone: "(555) 333-5555", vehicles: 3, avatar: getPersonAvatar(4, 'male') },
    { name: "Nancy Wilson", email: "n.wilson@email.com", phone: "(555) 444-6666", vehicles: 1, avatar: getPersonAvatar(5, 'female') },
    { name: "Paul Davis", email: "p.davis@email.com", phone: "(555) 555-7777", vehicles: 2, avatar: getPersonAvatar(6, 'male') },
  ],
  vehicle: [
    { owner: "Tom Anderson", make: "Toyota", model: "Camry", year: 2020, vin: "1HGBH41JXMN109186", mileage: 45000 },
    { owner: "Tom Anderson", make: "Ford", model: "F-150", year: 2018, vin: "1FTFW1E50JKE12345", mileage: 72000 },
    { owner: "Lisa Chen", make: "Honda", model: "Civic", year: 2022, vin: "2HGFC2F59NH567890", mileage: 18000 },
    { owner: "Mark Johnson", make: "BMW", model: "X5", year: 2021, vin: "5UXCR6C09M9B12345", mileage: 32000 },
  ],
  repairOrder: [
    { vehicle: "Toyota Camry 2020", service: "Oil Change", status: "completed", date: "2025-01-15", cost: 49.99 },
    { vehicle: "Ford F-150 2018", service: "Brake Pad Replacement", status: "in_progress", date: "2025-01-22", cost: 350.00 },
    { vehicle: "Honda Civic 2022", service: "30K Mile Service", status: "scheduled", date: "2025-01-28", cost: 299.99 },
  ],

  // Home Health / Caregiver
  careRecipient: [
    { name: "Margaret Wilson", age: 78, address: "100 Senior Lane", city: "Sunnydale", conditions: ["Diabetes", "Mobility issues"], emergencyContact: "Bob Wilson (son)", avatar: getPersonAvatar(7, 'female') },
    { name: "Harold Thompson", age: 82, address: "200 Elder Court", city: "Sunnydale", conditions: ["Dementia"], emergencyContact: "Susan Thompson (daughter)", avatar: getPersonAvatar(0, 'male') },
    { name: "Betty Davis", age: 75, address: "300 Comfort Drive", city: "Riverside", conditions: ["Arthritis"], emergencyContact: "James Davis (son)", avatar: getPersonAvatar(1, 'female') },
    { name: "George Martinez", age: 80, address: "400 Peaceful Way", city: "Lakewood", conditions: ["Heart condition"], emergencyContact: "Maria Martinez (daughter)", avatar: getPersonAvatar(2, 'male') },
  ],
  careVisit: [
    { recipient: "Margaret Wilson", caregiver: "Maria Santos", date: "2025-01-22", time: "09:00", duration: 4, services: ["Medication management", "Meal prep", "Light housekeeping"], status: "scheduled" },
    { recipient: "Harold Thompson", caregiver: "John Rivera", date: "2025-01-22", time: "14:00", duration: 3, services: ["Companionship", "Medication reminder", "Walk assistance"], status: "scheduled" },
  ],

  // Medical / Healthcare
  patient: [
    { name: "Alex Carter", email: "a.carter@email.com", phone: "(555) 111-2001", dateOfBirth: "1985-03-15", insurance: "Blue Cross", status: "active", avatar: getPersonAvatar(3, 'male') },
    { name: "Jordan Lee", email: "j.lee@email.com", phone: "(555) 222-3002", dateOfBirth: "1992-07-22", insurance: "Aetna", status: "active", avatar: getPersonAvatar(4, 'female') },
    { name: "Taylor Morgan", email: "t.morgan@email.com", phone: "(555) 333-4003", dateOfBirth: "1978-11-08", insurance: "United Health", status: "active", avatar: getPersonAvatar(5, 'male') },
    { name: "Casey Brooks", email: "c.brooks@email.com", phone: "(555) 444-5004", dateOfBirth: "2000-01-30", insurance: "Cigna", status: "active", avatar: getPersonAvatar(6, 'female') },
    { name: "Morgan Riley", email: "m.riley@email.com", phone: "(555) 555-6005", dateOfBirth: "1995-05-20", insurance: "Blue Cross", status: "active", avatar: getPersonAvatar(7, 'female') },
  ],
  appointment: [
    { patient: "Alex Carter", type: "Check-up", date: "2025-02-01", time: "09:00", duration: 30, provider: "Dr. Smith", status: "scheduled" },
    { patient: "Jordan Lee", type: "Follow-up", date: "2025-02-01", time: "10:30", duration: 30, provider: "Dr. Smith", status: "scheduled" },
    { patient: "Taylor Morgan", type: "Consultation", date: "2025-02-02", time: "14:00", duration: 45, provider: "Dr. Johnson", status: "scheduled" },
  ],
  treatment: [
    { patient: "Alex Carter", name: "Physical Therapy", date: "2025-01-15", notes: "Progress good", status: "completed" },
    { patient: "Jordan Lee", name: "Blood Work", date: "2025-01-20", notes: "Results pending", status: "in_progress" },
  ],

  // Common / Shared entities
  staff: [
    { name: "Sarah Johnson", email: "sarah.j@company.com", phone: "(555) 100-1001", role: "Manager", department: "Operations", status: "active", avatar: getPersonAvatar(0, 'female') },
    { name: "Michael Chen", email: "michael.c@company.com", phone: "(555) 100-1002", role: "Associate", department: "Sales", status: "active", avatar: getPersonAvatar(1, 'male') },
    { name: "Emily Rodriguez", email: "emily.r@company.com", phone: "(555) 100-1003", role: "Specialist", department: "Support", status: "active", avatar: getPersonAvatar(2, 'female') },
    { name: "David Kim", email: "david.k@company.com", phone: "(555) 100-1004", role: "Senior Associate", department: "Operations", status: "active", avatar: getPersonAvatar(3, 'male') },
    { name: "Jessica Martinez", email: "jessica.m@company.com", phone: "(555) 100-1005", role: "Lead", department: "Engineering", status: "active", avatar: getPersonAvatar(4, 'female') },
  ],
  // Client is a business entity, keep initials-based logo
  client: [
    { name: "Bluewave Plumbing", email: "contact@bluewave.com", phone: "(555) 200-2001", address: "100 Oak St", city: "Springfield", status: "active", avatar: avatarUrl("Bluewave Plumbing", "3b82f6") },
    { name: "Summit Electrical", email: "info@summit.com", phone: "(555) 200-2002", address: "200 Pine Ave", city: "Riverside", status: "active", avatar: avatarUrl("Summit Electrical", "f59e0b") },
    { name: "Prime Build", email: "hello@primebuild.com", phone: "(555) 200-2003", address: "300 Maple Rd", city: "Oakland", status: "active", avatar: avatarUrl("Prime Build", "10b981") },
    { name: "GreenScape Gardens", email: "team@greenscape.com", phone: "(555) 200-2004", address: "400 Elm Blvd", city: "Lakewood", status: "active", avatar: avatarUrl("GreenScape Gardens", "14b8a6") },
    { name: "TechFlow Solutions", email: "info@techflow.com", phone: "(555) 200-2005", address: "500 Tech Park Dr", city: "San Jose", status: "active", avatar: avatarUrl("TechFlow Solutions", "6366f1") },
  ],
  invoice: [
    { client: "Bluewave Plumbing", number: "INV-001", amount: 1500.00, date: "2025-01-15", dueDate: "2025-02-15", status: "paid" },
    { client: "Summit Electrical", number: "INV-002", amount: 3200.00, date: "2025-01-18", dueDate: "2025-02-18", status: "pending" },
    { client: "Prime Build", number: "INV-003", amount: 8500.00, date: "2025-01-20", dueDate: "2025-02-20", status: "pending" },
    { client: "GreenScape Gardens", number: "INV-004", amount: 450.00, date: "2025-01-10", dueDate: "2025-02-10", status: "overdue" },
  ],
  payment: [
    { client: "Bluewave Plumbing", invoice: "INV-001", amount: 1500.00, date: "2025-01-28", method: "check", status: "completed" },
    { client: "Prime Build", invoice: "INV-003", amount: 4250.00, date: "2025-01-22", method: "card", status: "completed" },
  ],
  task: [
    { title: "Follow up with client", assignee: "Sarah Johnson", dueDate: "2025-01-25", priority: "high", status: "pending" },
    { title: "Review proposal", assignee: "Michael Chen", dueDate: "2025-01-26", priority: "medium", status: "in_progress" },
    { title: "Update documentation", assignee: "Emily Rodriguez", dueDate: "2025-01-30", priority: "low", status: "pending" },
  ],
  notification: [
    { title: "New appointment scheduled", message: "Alex Carter scheduled for Feb 1st", type: "info", read: false, createdAt: "2025-01-20" },
    { title: "Payment received", message: "Bluewave Plumbing paid INV-001", type: "success", read: true, createdAt: "2025-01-28" },
    { title: "Invoice overdue", message: "GreenScape Gardens invoice is past due", type: "warning", read: false, createdAt: "2025-01-12" },
  ],
};

/**
 * Get sample data for a specific entity type
 * @param entityId The entity ID to get sample data for
 * @param industry Optional industry hint to get industry-specific templates
 * @returns Array of sample records, or empty array if no template exists
 */
export function getSampleDataForEntity(entityId: string, industry?: string): Array<Record<string, unknown>> {
  const lowerEntityId = entityId.toLowerCase();
  const industryLower = (industry || '').toLowerCase();
  
  // FIRST: Check industry-specific overrides for common entities
  // This ensures bakeries get bakery items, restaurants get menu items, etc.
  if (lowerEntityId === 'product' || lowerEntityId === 'item') {
    // Bakery/Cafe uses bakeryItem templates
    if (industryLower.includes('bakery') || industryLower.includes('cafe') || industryLower.includes('pastry')) {
      return SAMPLE_DATA_TEMPLATES.bakeryItem || [];
    }
    // Restaurant uses menuItem templates  
    if (industryLower.includes('restaurant') || industryLower.includes('food')) {
      return SAMPLE_DATA_TEMPLATES.menuItem || [];
    }
  }
  
  // Try exact match
  if (SAMPLE_DATA_TEMPLATES[entityId]) {
    return SAMPLE_DATA_TEMPLATES[entityId];
  }
  
  // Try lowercase match
  const matchingKey = Object.keys(SAMPLE_DATA_TEMPLATES).find(
    key => key.toLowerCase() === lowerEntityId
  );
  
  if (matchingKey) {
    return SAMPLE_DATA_TEMPLATES[matchingKey];
  }
  
  return [];
}

/**
 * Get all sample data for an industry kit
 * @param industryEntities Array of entity IDs for the industry
 * @returns Object with entity IDs as keys and sample data arrays as values
 */
export function getSampleDataForIndustry(
  industryEntities: string[]
): Record<string, Array<Record<string, unknown>>> {
  const result: Record<string, Array<Record<string, unknown>>> = {};
  
  for (const entityId of industryEntities) {
    const data = getSampleDataForEntity(entityId);
    if (data.length > 0) {
      result[entityId] = data;
    }
  }
  
  return result;
}
