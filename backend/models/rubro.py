from extensions import db
from datetime import datetime


class Rubro(db.Model):
    __tablename__ = "rubros"

    id_rubro = db.Column(db.Integer, primary_key=True)
    id_nomina = db.Column(db.Integer, db.ForeignKey("nominas.id_nomina"), nullable=False)

    codigo = db.Column(db.String(50), nullable=True)
    descripcion = db.Column(db.String(255), nullable=True)
    tipo = db.Column(db.String(50), nullable=False)  # devengo, deduccion
    monto = db.Column(db.Float, nullable=False, default=0.0)

    fecha_creacion = db.Column(db.DateTime, default=datetime.utcnow)
    fecha_actualizacion = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    creado_por = db.Column(db.Integer, nullable=True)
    modificado_por = db.Column(db.Integer, nullable=True)

    # Relación con Nómina
    nomina = db.relationship("Nomina", backref="rubros")

    def __repr__(self):
        return f"<Rubro {self.id_rubro} - Nomina {self.id_nomina} - {self.descripcion} : {self.monto}>"
