-- Insertar usuarios
INSERT INTO usuarios (username, password, rol) VALUES
('admin', '$2b$12$KQdDZ8vZ7.5N9X5hMJL6KOqTnx0D3X7kY8YqJ5X1X2X3X4X5X6X7Xu', 'Administrador'),
('supervisor', '$2b$12$KQdDZ8vZ7.5N9X5hMJL6KOqTnx0D3X7kY8YqJ5X1X2X3X4X5X6X7Xu', 'Supervisor'),
('empleado1', '$2b$12$KQdDZ8vZ7.5N9X5hMJL6KOqTnx0D3X7kY8YqJ5X1X2X3X4X5X6X7Xu', 'Empleado')
ON CONFLICT (username) DO NOTHING;

-- Insertar cargos
INSERT INTO cargos (nombre_cargo, sueldo_base, permisos) VALUES
('Gerente General', 3500.00, '["dashboard","cargos","usuarios","empleados","asistencias","nomina","reportes"]'),
('Jefe de RRHH', 2800.00, '["dashboard","cargos","usuarios","empleados","asistencias","nomina"]'),
('Contador', 2500.00, '["dashboard","nomina","reportes"]'),
('Vendedor', 1200.00, '["dashboard"]'),
('Cajero', 800.00, '["dashboard"]')
ON CONFLICT DO NOTHING;

-- Insertar empleados
INSERT INTO empleados (cedula, nombres, apellidos, fecha_nacimiento, fecha_ingreso, id_cargo, estado) VALUES
('0912345678', 'Juan Carlos', 'Pérez García', '1985-05-15', '2023-01-15', 1, 'Activo'),
('0923456789', 'María Elena', 'González López', '1990-08-22', '2023-02-20', 2, 'Activo'),
('0934567890', 'Carlos Alberto', 'Rodríguez Sánchez', '1988-03-10', '2023-03-10', 3, 'Activo'),
('0945678901', 'Ana Patricia', 'Martínez Torres', '1992-11-05', '2023-04-05', 4, 'Activo'),
('0956789012', 'Luis Fernando', 'Hernández Vega', '1987-07-18', '2023-05-12', 5, 'Activo')
ON CONFLICT (cedula) DO NOTHING;
