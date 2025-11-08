# Prisma Setup Guide - Learn2Grow Backend

## ✅ What Was Done

### 1. **Installed Prisma**
- `@prisma/client` - Database client
- `prisma` - Prisma CLI

### 2. **Removed Old Setup**
- ❌ Removed `node-pg-migrate` and migration files
- ❌ Removed old `database` module
- ❌ Removed `database.json` config

### 3. **Renamed Everything to Plural (PostgreSQL Standard)**
```
client  → clients  ✅
Client  → Clients  ✅
```

### 4. **Created Prisma Setup**
```
prisma/
└── schema.prisma          ← Database schema definition

src/modules/
├── prisma/
│   ├── prisma.service.ts  ← Database connection
│   └── prisma.module.ts   ← Global module
└── clients/
    ├── clients.controller.ts
    ├── clients.service.ts
    ├── clients.repository.ts  ← Has BOTH Prisma + Raw SQL
    └── dtos/
```

---

## 🎯 How to Use

### **Method 1: Prisma Client (Recommended)** ⭐

Use the standard Prisma Client methods in your repository:

```typescript
// Find all
const clients = await this.prisma.clients.findMany();

// Find by ID
const client = await this.prisma.clients.findUnique({ where: { id: 1 } });

// Create
const client = await this.prisma.clients.create({
  data: { name: "John", metadata: { phone: "123" } }
});

// Update
const client = await this.prisma.clients.update({
  where: { id: 1 },
  data: { name: "Jane" }
});

// Delete
await this.prisma.clients.delete({ where: { id: 1 } });
```

**Benefits:**
- ✅ Type-safe
- ✅ Auto-completion
- ✅ Less code
- ✅ Optimized queries

---

### **Method 2: Raw SQL Queries (For Learning)** 📚

Use `$queryRaw` for SELECT and `$executeRaw` for INSERT/UPDATE/DELETE:

```typescript
// SELECT with $queryRaw
const clients = await this.prisma.$queryRaw<IClients[]>`
  SELECT id, name, metadata, created_at, updated_at
  FROM clients
  WHERE name LIKE ${`%John%`}
  ORDER BY created_at DESC
`;

// INSERT with $queryRaw + RETURNING
const newClient = await this.prisma.$queryRaw<IClients[]>`
  INSERT INTO clients (name, metadata)
  VALUES (${name}, ${JSON.stringify(metadata)}::jsonb)
  RETURNING *
`;

// UPDATE with $executeRaw
const count = await this.prisma.$executeRaw`
  UPDATE clients
  SET name = ${newName}
  WHERE id = ${id}
`;

// DELETE with $executeRaw
const count = await this.prisma.$executeRaw`
  DELETE FROM clients
  WHERE id = ${id}
`;

// Complex PostgreSQL queries
const result = await this.prisma.$queryRaw`
  SELECT *
  FROM clients
  WHERE metadata ? 'phone'  -- JSONB operator
  AND created_at > NOW() - INTERVAL '7 days'
`;
```

**Benefits:**
- ✅ Full PostgreSQL control
- ✅ Learn SQL syntax
- ✅ Complex queries
- ✅ Use PostgreSQL-specific features

---

## 📡 API Endpoints

### **Standard Endpoints (Using Prisma Client)**

```bash
# Create client
POST http://localhost:3000/clients
{
  "name": "John Doe",
  "metadata": { "phone": "123-456-7890" }
}

# Get all clients
GET http://localhost:3000/clients

# Get by ID
GET http://localhost:3000/clients/1

# Update
PATCH http://localhost:3000/clients/1
{
  "name": "Jane Doe"
}

# Delete
DELETE http://localhost:3000/clients/1

# Get count
GET http://localhost:3000/clients/stats/count
```

### **RAW SQL Endpoints (For Learning)**

```bash
# Get all (RAW SQL)
GET http://localhost:3000/clients/raw/all

# Get by ID (RAW SQL)
GET http://localhost:3000/clients/raw/1

# Create (RAW SQL)
POST http://localhost:3000/clients/raw
{
  "name": "Test User",
  "metadata": { "test": true }
}
```

---

## 🔄 How to Add New Fields

### **Step 1: Update Schema**

Edit `prisma/schema.prisma`:

```prisma
model clients {
  id         Int       @id @default(autoincrement())
  name       String    @db.VarChar(255)
  email      String?   @unique @db.VarChar(255)  // ← Add this
  metadata   Json?     @db.JsonB
  created_at DateTime  @default(now())
  updated_at DateTime  @updatedAt
}
```

### **Step 2: Create Migration**

```bash
npm run prisma:migrate
# Name it: "add-email-field"
```

This will:
- ✅ Generate SQL migration
- ✅ Apply to database
- ✅ Update Prisma Client types

### **Step 3: Update DTOs**

```typescript
// create-clients.dto.ts
export class CreateClientsDto {
  @IsString()
  name: string;

  @IsEmail()  // ← Add
  @IsOptional()
  email?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
```

### **Step 4: That's It!**

✅ Repository automatically gets the new field (Prisma types)
✅ Service automatically gets the new field
✅ Controller automatically gets the new field

---

## 🛠️ Prisma Commands

```bash
# Generate Prisma Client (after schema changes)
npm run prisma:generate

# Create and apply migration
npm run prisma:migrate
# This runs: prisma migrate dev

# Open Prisma Studio (Database GUI)
npm run prisma:studio

# Deploy migrations to production
npm run prisma:deploy

# Pull schema from existing database
npx prisma db pull

# Push schema without creating migration (dev only)
npx prisma db push

# Format schema file
npx prisma format
```

---

## 📚 Learning Resources

### **Repository Methods**

Your `clients.repository.ts` has TWO sets of methods:

| Prisma Client | Raw SQL |
|---------------|---------|
| `findAll()` | `findAllRaw()` |
| `findById()` | `findByIdRaw()` |
| `create()` | `createRaw()` |
| `update()` | `updateRaw()` |
| `delete()` | `deleteRaw()` |

### **Compare & Learn**

Open `src/modules/clients/clients.repository.ts` and compare:
1. How Prisma does it (simpler, type-safe)
2. How raw SQL does it (more control, learn SQL)

---

## 🎓 Practice Exercises

### **Exercise 1: Add Email Field**
1. Update `schema.prisma`
2. Run migration
3. Update DTOs
4. Test both Prisma and Raw SQL methods

### **Exercise 2: Complex Query**
Write a raw SQL query to:
```sql
-- Find all clients created in last 7 days with specific metadata
SELECT * FROM clients
WHERE created_at > NOW() - INTERVAL '7 days'
AND metadata @> '{"premium": true}'::jsonb
ORDER BY created_at DESC;
```

### **Exercise 3: Transaction**
Use the `createMultiple()` method in repository to learn transactions.

---

## 🔍 Debugging

### **View Generated SQL**

Prisma logs queries in development. Check console for:
```
Query: SELECT "clients"."id", "clients"."name" FROM "clients"
Params: []
Duration: 2ms
```

### **Prisma Studio**

Visual database browser:
```bash
npm run prisma:studio
```

Opens: http://localhost:5555

---

## ✅ Standards Followed

1. ✅ **Plural naming**: `clients` (not `client`)
2. ✅ **snake_case**: `created_at` (PostgreSQL standard)
3. ✅ **Repository pattern**: Separate data access layer
4. ✅ **Global Prisma module**: Available everywhere
5. ✅ **Both approaches**: Prisma Client + Raw SQL

---

## 🚀 Next Steps

1. **Add more fields** - Practice migrations
2. **Write complex queries** - Learn SQL with raw methods
3. **Add relations** - Link clients to other tables
4. **Add indexes** - Optimize performance
5. **Add full-text search** - Use PostgreSQL features

---

## 💡 Tips

- Use **Prisma Client** for regular CRUD operations
- Use **Raw SQL** when you need:
  - Complex joins
  - PostgreSQL-specific features
  - Performance optimization
  - Learning SQL

---

Happy Learning! 🎉
