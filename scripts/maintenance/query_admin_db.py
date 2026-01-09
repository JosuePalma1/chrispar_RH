import sqlite3
conn=sqlite3.connect('backend/database.db')
c=conn.cursor()
try:
    c.execute("SELECT username, password FROM usuarios WHERE username='admin'")
    row=c.fetchone()
    if row:
        print('username:', row[0])
        print('password hash:', row[1])
    else:
        print('admin no encontrado')
except Exception as e:
    print('error:', e)
finally:
    conn.close()
