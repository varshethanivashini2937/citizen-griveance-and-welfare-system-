
from app import app, db, User, Complaint
from sqlalchemy import func

def generate_report():
    with app.app_context():
        print("="*60)
        print("                  DATABASE REPORT")
        print("="*60)
        
        # --- Users Report ---
        users = User.query.all()
        print(f"\n[USERS] Total: {len(users)}")
        print(f"{'ID':<5} {'Name':<20} {'Email':<30} {'Role':<10}")
        print("-" * 70)
        for u in users:
            print(f"{u.id:<5} {u.name:<20} {u.email:<30} {u.role:<10}")
            
        # --- Complaints Report ---
        complaints = Complaint.query.all()
        print(f"\n[COMPLAINTS] Total: {len(complaints)}")
        print(f"{'ID':<5} {'cat':<15} {'Priority':<10} {'Status':<12} {'Pincode':<8} {'Description'}")
        print("-" * 100)
        for c in complaints:
            desc = (c.description[:30] + '..') if len(c.description) > 30 else c.description
            print(f"{c.id:<5} {c.category:<15} {c.priority:<10} {c.status:<12} {c.pincode:<8} {desc}")

        # --- Statistics ---
        print("\n[STATISTICS]")
        
        # Complaints by Sector
        print("\nBy Sector:")
        sectors = db.session.query(Complaint.category, func.count(Complaint.id)).group_by(Complaint.category).all()
        for sector, count in sectors:
            print(f"  - {sector}: {count}")
            
        # Complaints by Status
        print("\nBy Status:")
        statuses = db.session.query(Complaint.status, func.count(Complaint.id)).group_by(Complaint.status).all()
        for status, count in statuses:
            print(f"  - {status}: {count}")

        # Complaints by Priority
        print("\nBy Priority:")
        priorities = db.session.query(Complaint.priority, func.count(Complaint.id)).group_by(Complaint.priority).all()
        for priority, count in priorities:
            print(f"  - {priority}: {count}")

        print("\n" + "="*60)

if __name__ == "__main__":
    generate_report()
