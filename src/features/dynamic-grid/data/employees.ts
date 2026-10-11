export type EmployeeStatus = "Active" | "Invited" | "Suspended";

export interface EmployeeRow {
  id: string;
  name: string;
  email: string;
  department: string;
  role: string;
  status: EmployeeStatus;
  location: string;
  lastActive: string;
  projects: number;
}

const departments = [
  "Engineering",
  "Finance",
  "Operations",
  "Sales",
  "Product",
  "Support",
];
const roles = [
  "Principal Engineer",
  "Senior Engineer",
  "Manager",
  "Analyst",
  "Specialist",
  "Administrator",
];
const locations = [
  "Pune",
  "Bengaluru",
  "Hyderabad",
  "Mumbai",
  "Delhi",
  "Remote",
];
const statuses: EmployeeStatus[] = [
  "Active",
  "Active",
  "Active",
  "Invited",
  "Suspended",
];
const firstNames = [
  "Aarav",
  "Diya",
  "Kabir",
  "Meera",
  "Arjun",
  "Ananya",
  "Rohan",
  "Isha",
  "Vivaan",
  "Sara",
];
const lastNames = [
  "Sharma",
  "Patel",
  "Verma",
  "Rao",
  "Singh",
  "Mehta",
  "Iyer",
  "Khan",
  "Joshi",
  "Gupta",
];

export const employees: EmployeeRow[] = Array.from(
  { length: 137 },
  (_, index) => {
    const first = firstNames[index % firstNames.length];
    const last = lastNames[(index * 3) % lastNames.length];
    return {
      id: `EMP-${String(index + 1).padStart(4, "0")}`,
      name: `${first} ${last}`,
      email: `${first}.${last}.${index + 1}@example.com`.toLowerCase(),
      department: departments[index % departments.length]!,
      role: roles[(index * 2) % roles.length]!,
      status: statuses[index % statuses.length]!,
      location: locations[(index * 5) % locations.length]!,
      lastActive: new Date(
        2026,
        8,
        8 - (index % 28),
        9 + (index % 8),
        index % 60,
      ).toISOString(),
      projects: (index * 7) % 12,
    };
  },
);
