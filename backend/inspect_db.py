import psycopg

conn = psycopg.connect("host=localhost port=5433 dbname=humedales_db user=postgres")
cur = conn.cursor()
cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public'")
tables = [row[0] for row in cur.fetchall()]
print("Tables:", tables)

for t in tables:
    cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = %s", (t,))
    cols = cur.fetchall()
    print(f"Table {t}: {cols}")
