/**
 * Domain-specific sample data templates for demos/previews
 * These provide realistic, industry-relevant data for generated apps
 */

export const SAMPLE_DATA_TEMPLATES: Record<string, Array<Record<string, unknown>>> = {
  // Property Management
  tenant: [
    { name: "John Smith", email: "john.smith@email.com", phone: "(555) 123-4567", unit: "4B", leaseEnd: "2026-03-15", rent: 1500, status: "active" },
    { name: "Sarah Johnson", email: "sarah.j@email.com", phone: "(555) 234-5678", unit: "2A", leaseEnd: "2025-08-01", rent: 1200, status: "active" },
    { name: "Michael Chen", email: "m.chen@email.com", phone: "(555) 345-6789", unit: "3C", leaseEnd: "2026-01-31", rent: 1350, status: "active" },
    { name: "Emily Rodriguez", email: "emily.r@email.com", phone: "(555) 456-7890", unit: "1A", leaseEnd: "2025-12-15", rent: 1100, status: "active" },
    { name: "David Kim", email: "d.kim@email.com", phone: "(555) 567-8901", unit: "5D", leaseEnd: "2025-06-30", rent: 1600, status: "expiring" },
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
    { name: "Emily Davis", email: "emily.d@email.com", phone: "(555) 111-2222", plan: "Premium", joinDate: "2025-01-15", status: "active" },
    { name: "Mike Wilson", email: "mike.w@email.com", phone: "(555) 222-3333", plan: "Basic", joinDate: "2025-06-20", status: "active" },
    { name: "Jessica Taylor", email: "jess.t@email.com", phone: "(555) 333-4444", plan: "Premium", joinDate: "2024-09-01", status: "active" },
    { name: "Chris Anderson", email: "chris.a@email.com", phone: "(555) 444-5555", plan: "Family", joinDate: "2024-11-15", status: "active" },
    { name: "Amanda White", email: "amanda.w@email.com", phone: "(555) 555-6666", plan: "Basic", joinDate: "2025-01-01", status: "frozen" },
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
    { name: "Alex Chen", email: "alex.parent@email.com", phone: "(555) 777-8888", gradeLevel: "10th", subjects: ["Math", "Physics"], status: "active" },
    { name: "Olivia Brown", email: "brown.family@email.com", phone: "(555) 888-9999", gradeLevel: "8th", subjects: ["Science", "English"], status: "active" },
    { name: "Ethan Martinez", email: "martinez.home@email.com", phone: "(555) 999-0000", gradeLevel: "11th", subjects: ["SAT Prep", "Math"], status: "active" },
    { name: "Sophie Lee", email: "lee.parents@email.com", phone: "(555) 000-1111", gradeLevel: "7th", subjects: ["Math"], status: "active" },
    { name: "Noah Johnson", email: "johnson.fam@email.com", phone: "(555) 112-2334", gradeLevel: "9th", subjects: ["English", "History"], status: "paused" },
  ],
  lesson: [
    { student: "Alex Chen", subject: "Math", date: "2025-01-22", time: "16:00", duration: 60, status: "scheduled", notes: "Review calculus derivatives" },
    { student: "Alex Chen", subject: "Physics", date: "2025-01-24", time: "16:00", duration: 60, status: "scheduled", notes: "Kinematics problems" },
    { student: "Olivia Brown", subject: "Science", date: "2025-01-23", time: "15:00", duration: 45, status: "scheduled", notes: "Chemistry lab prep" },
    { student: "Ethan Martinez", subject: "SAT Prep", date: "2025-01-25", time: "10:00", duration: 90, status: "scheduled", notes: "Practice test review" },
  ],

  // Restaurant
  guest: [
    { name: "Robert Garcia", email: "r.garcia@email.com", phone: "(555) 321-4321", visits: 12, lastVisit: "2025-01-18", vip: true },
    { name: "Linda Martinez", email: "l.martinez@email.com", phone: "(555) 432-5432", visits: 5, lastVisit: "2025-01-15", vip: false },
    { name: "James Wilson", email: "j.wilson@email.com", phone: "(555) 543-6543", visits: 8, lastVisit: "2025-01-20", vip: true },
  ],
  menuItem: [
    { name: "Grilled Salmon", category: "Entrees", price: 28.99, description: "Atlantic salmon with lemon herb butter", available: true },
    { name: "Caesar Salad", category: "Starters", price: 12.99, description: "Romaine, parmesan, croutons, house dressing", available: true },
    { name: "Ribeye Steak", category: "Entrees", price: 42.99, description: "12oz prime ribeye, choice of two sides", available: true },
    { name: "Chocolate Lava Cake", category: "Desserts", price: 9.99, description: "Warm chocolate cake with vanilla ice cream", available: true },
  ],
  reservation: [
    { guest: "Robert Garcia", date: "2025-01-25", time: "19:00", partySize: 4, table: "12", status: "confirmed", notes: "Anniversary dinner" },
    { guest: "Linda Martinez", date: "2025-01-25", time: "18:30", partySize: 2, table: "5", status: "confirmed", notes: "" },
    { guest: "James Wilson", date: "2025-01-26", time: "20:00", partySize: 6, table: "VIP1", status: "pending", notes: "Business dinner" },
  ],
  order: [
    { table: "12", items: ["Caesar Salad", "Grilled Salmon", "Ribeye Steak"], subtotal: 84.97, tax: 7.22, total: 92.19, status: "served" },
    { table: "5", items: ["Caesar Salad", "Chocolate Lava Cake"], subtotal: 22.98, tax: 1.95, total: 24.93, status: "preparing" },
  ],

  // Home Services (Plumber, Electrician, HVAC, etc.)
  homeowner: [
    { name: "Patricia Thompson", email: "p.thompson@email.com", phone: "(555) 654-7654", address: "123 Maple Drive", city: "Springfield" },
    { name: "William Brown", email: "w.brown@email.com", phone: "(555) 765-8765", address: "456 Oak Avenue", city: "Springfield" },
    { name: "Jennifer Davis", email: "j.davis@email.com", phone: "(555) 876-9876", address: "789 Pine Street", city: "Riverside" },
  ],
  serviceJob: [
    { customer: "Patricia Thompson", type: "repair", description: "Fix leaking pipe under kitchen sink", scheduledDate: "2025-01-24", status: "scheduled", estimatedCost: 150 },
    { customer: "William Brown", type: "installation", description: "Install new water heater", scheduledDate: "2025-01-26", status: "scheduled", estimatedCost: 1200 },
    { customer: "Jennifer Davis", type: "maintenance", description: "Annual HVAC inspection", scheduledDate: "2025-01-23", status: "completed", estimatedCost: 99 },
  ],

  // E-commerce
  customer: [
    { name: "Rachel Green", email: "r.green@email.com", phone: "(555) 987-6543", totalOrders: 15, totalSpent: 1250.00, memberSince: "2024-03-15" },
    { name: "Ross Geller", email: "r.geller@email.com", phone: "(555) 876-5432", totalOrders: 8, totalSpent: 650.00, memberSince: "2024-06-20" },
    { name: "Monica Bing", email: "m.bing@email.com", phone: "(555) 765-4321", totalOrders: 22, totalSpent: 2100.00, memberSince: "2023-11-01" },
  ],
  product: [
    { name: "Wireless Earbuds Pro", sku: "WEP-001", price: 79.99, category: "Electronics", stock: 45, status: "active" },
    { name: "Organic Cotton T-Shirt", sku: "OCT-002", price: 29.99, category: "Apparel", stock: 120, status: "active" },
    { name: "Stainless Steel Water Bottle", sku: "SWB-003", price: 24.99, category: "Accessories", stock: 85, status: "active" },
    { name: "Yoga Mat Premium", sku: "YMP-004", price: 49.99, category: "Fitness", stock: 30, status: "active" },
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
    { name: "Tom Anderson", email: "t.anderson@email.com", phone: "(555) 111-3333", vehicles: 2 },
    { name: "Lisa Chen", email: "l.chen@email.com", phone: "(555) 222-4444", vehicles: 1 },
    { name: "Mark Johnson", email: "m.johnson@email.com", phone: "(555) 333-5555", vehicles: 3 },
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
    { name: "Margaret Wilson", age: 78, address: "100 Senior Lane", city: "Sunnydale", conditions: ["Diabetes", "Mobility issues"], emergencyContact: "Bob Wilson (son)" },
    { name: "Harold Thompson", age: 82, address: "200 Elder Court", city: "Sunnydale", conditions: ["Dementia"], emergencyContact: "Susan Thompson (daughter)" },
    { name: "Betty Davis", age: 75, address: "300 Comfort Drive", city: "Riverside", conditions: ["Arthritis"], emergencyContact: "James Davis (son)" },
  ],
  careVisit: [
    { recipient: "Margaret Wilson", caregiver: "Maria Santos", date: "2025-01-22", time: "09:00", duration: 4, services: ["Medication management", "Meal prep", "Light housekeeping"], status: "scheduled" },
    { recipient: "Harold Thompson", caregiver: "John Rivera", date: "2025-01-22", time: "14:00", duration: 3, services: ["Companionship", "Medication reminder", "Walk assistance"], status: "scheduled" },
  ],

  // Medical / Healthcare
  patient: [
    { name: "Alex Carter", email: "a.carter@email.com", phone: "(555) 111-2001", dateOfBirth: "1985-03-15", insurance: "Blue Cross", status: "active" },
    { name: "Jordan Lee", email: "j.lee@email.com", phone: "(555) 222-3002", dateOfBirth: "1992-07-22", insurance: "Aetna", status: "active" },
    { name: "Taylor Morgan", email: "t.morgan@email.com", phone: "(555) 333-4003", dateOfBirth: "1978-11-08", insurance: "United Health", status: "active" },
    { name: "Casey Brooks", email: "c.brooks@email.com", phone: "(555) 444-5004", dateOfBirth: "2000-01-30", insurance: "Cigna", status: "active" },
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
    { name: "Sarah Johnson", email: "sarah.j@company.com", phone: "(555) 100-1001", role: "Manager", department: "Operations", status: "active" },
    { name: "Michael Chen", email: "michael.c@company.com", phone: "(555) 100-1002", role: "Associate", department: "Sales", status: "active" },
    { name: "Emily Rodriguez", email: "emily.r@company.com", phone: "(555) 100-1003", role: "Specialist", department: "Support", status: "active" },
    { name: "David Kim", email: "david.k@company.com", phone: "(555) 100-1004", role: "Senior Associate", department: "Operations", status: "active" },
  ],
  client: [
    { name: "Bluewave Plumbing", email: "contact@bluewave.com", phone: "(555) 200-2001", address: "100 Oak St", city: "Springfield", status: "active" },
    { name: "Summit Electrical", email: "info@summit.com", phone: "(555) 200-2002", address: "200 Pine Ave", city: "Riverside", status: "active" },
    { name: "Prime Build", email: "hello@primebuild.com", phone: "(555) 200-2003", address: "300 Maple Rd", city: "Oakland", status: "active" },
    { name: "GreenScape Gardens", email: "team@greenscape.com", phone: "(555) 200-2004", address: "400 Elm Blvd", city: "Lakewood", status: "active" },
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
 * @returns Array of sample records, or empty array if no template exists
 */
export function getSampleDataForEntity(entityId: string): Array<Record<string, unknown>> {
  // Try exact match first
  if (SAMPLE_DATA_TEMPLATES[entityId]) {
    return SAMPLE_DATA_TEMPLATES[entityId];
  }
  
  // Try lowercase match
  const lowerEntityId = entityId.toLowerCase();
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
