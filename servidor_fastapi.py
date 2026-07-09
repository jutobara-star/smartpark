import re
import smtplib
import time
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="Backend SmartPark")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================================================
# MODELOS DE DATOS
# =========================================================
class LoginRequest(BaseModel):
    email: str
    rut: str
    patente: str
    password: str


class RecuperarRequest(BaseModel):
    rut: str
    email: str


class RegistroRequest(BaseModel):
    nombre: str
    email: str
    rut: str
    patente: str
    telefono: str = ""
    password: str


class IniciarEstacionamientoRequest(BaseModel):
    rut: str
    patente: str
    sector: str


class FinalizarEstacionamientoRequest(BaseModel):
    rut: str


class PagoRequest(BaseModel):
    rut: str
    metodo_pago: str


# =========================================================
# "BASE DE DATOS" SIMULADA (en memoria)
# =========================================================
USUARIOS_REGISTRADOS = {
    "21711820-4": {
        "nombre": "Cristóbal",
        "email": "cristobal324.cl@gmail.com",
        "password": "password123",
        "patente": "ASDS-21",
        "telefono": "",
    },
    "11111111-1": {
        "nombre": "Usuario Prueba",
        "email": "prueba@duoc.cl",
        "password": "admin",
        "patente": "ABCD-12",
        "telefono": "",
    },
}

# Sesiones de estacionamiento activas o recién finalizadas, indexadas por RUT
ESTACIONAMIENTOS = {}

SECTORES_VALIDOS = ["Centro Viña del Mar", "Avenida Perú", "15 Norte"]
TARIFA_BASE = 660
MINUTOS_BASE = 20
TARIFA_POR_MINUTO = 34


# =========================================================
# LÓGICA DE VALIDACIÓN
# =========================================================
def validar_rut(rut_completo: str) -> bool:
    if not re.match(r"^[0-9]+-[0-9kK]$", rut_completo):
        return False
    rut, dv = rut_completo.split("-")
    rut_reverso = map(int, reversed(rut))
    factores = [2, 3, 4, 5, 6, 7]
    suma = sum(d * factores[i % 6] for i, d in enumerate(rut_reverso))
    dv_esperado = 11 - (suma % 11)
    if dv_esperado == 11:
        dv_esperado = "0"
    elif dv_esperado == 10:
        dv_esperado = "K"
    else:
        dv_esperado = str(dv_esperado)
    return dv.upper() == dv_esperado


def validar_patente(patente: str) -> bool:
    patente_limpia = patente.replace("-", "").upper()
    es_formato_antiguo = bool(re.match(r"^[A-Z]{2}[0-9]{4}$", patente_limpia))
    es_formato_nuevo = bool(re.match(r"^[A-Z]{4}[0-9]{2}$", patente_limpia))
    return es_formato_antiguo or es_formato_nuevo


def validar_correo(correo: str) -> bool:
    return bool(re.match(r"^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$", correo))


def calcular_tarifa(segundos: float) -> int:
    minutos = int(segundos // 60)
    if minutos <= MINUTOS_BASE:
        return TARIFA_BASE
    return TARIFA_BASE + (minutos - MINUTOS_BASE) * TARIFA_POR_MINUTO


def enviar_correo_recuperacion(email_destino: str, nueva_clave: str):
    smtp_server = "smtp.gmail.com"
    port = 587

    # IMPORTANTE: estos datos deben venir de variables de entorno, no quedar
    # escritos en el código. Ver instrucciones al final del archivo.
    import os

    sender_email = os.environ.get("SMARTPARK_SMTP_EMAIL", "")
    sender_password = os.environ.get("SMARTPARK_SMTP_PASSWORD", "")

    if not sender_email or not sender_password:
        print("Aviso SMTP: faltan credenciales en variables de entorno")
        return False

    message = MIMEMultipart()
    message["From"] = sender_email
    message["To"] = email_destino
    message["Subject"] = "Recuperación de Contraseña - SmartPark"

    cuerpo = f"""
    Hola,

    Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en SmartPark.
    Tu nueva contraseña temporal de acceso es:

    {nueva_clave}

    Te recomendamos iniciar sesión y cambiarla de inmediato desde tu panel de control.

    Saludos,
    El equipo de SmartPark.
    """
    message.attach(MIMEText(cuerpo, "plain"))

    try:
        server = smtplib.SMTP(smtp_server, port)
        server.starttls()
        server.login(sender_email, sender_password)
        server.sendmail(sender_email, email_destino, message.as_string())
        server.quit()
        return True
    except Exception as e:
        print(f"Aviso SMTP: {e}")
        return False


# =========================================================
# ENDPOINTS — CUENTA
# =========================================================
@app.post("/api/registro")
async def registrar_cliente(request: RegistroRequest):
    if request.nombre.strip() == "":
        raise HTTPException(status_code=400, detail="Debe ingresar su nombre completo")
    if not validar_correo(request.email):
        raise HTTPException(status_code=400, detail="Correo electrónico inválido")
    if not validar_rut(request.rut):
        raise HTTPException(status_code=400, detail="El RUT ingresado no es válido")
    if not validar_patente(request.patente):
        raise HTTPException(status_code=400, detail="El formato de la patente es incorrecto")
    if len(request.password) < 6:
        raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 6 caracteres")
    if request.rut in USUARIOS_REGISTRADOS:
        raise HTTPException(status_code=409, detail="Ya existe una cuenta registrada con ese RUT")

    USUARIOS_REGISTRADOS[request.rut] = {
        "nombre": request.nombre,
        "email": request.email,
        "password": request.password,
        "patente": request.patente.upper(),
        "telefono": request.telefono,
    }

    return {
        "estado": "exito",
        "mensaje": "Cuenta creada correctamente. Ya puedes iniciar sesión.",
    }


@app.post("/api/login")
async def iniciar_sesion(request: LoginRequest):
    if not validar_rut(request.rut):
        raise HTTPException(status_code=400, detail="El RUT ingresado no es válido")
    if not validar_patente(request.patente):
        raise HTTPException(status_code=400, detail="El formato de la patente es incorrecto")

    usuario_guardado = USUARIOS_REGISTRADOS.get(request.rut)
    if not usuario_guardado:
        raise HTTPException(status_code=401, detail="Usuario no registrado en el sistema")
    if usuario_guardado["password"] != request.password:
        raise HTTPException(status_code=401, detail="Contraseña incorrecta")

    return {
        "estado": "exito",
        "mensaje": "Inicio de sesión aprobado",
        "datos_sesion": {
            "nombre": usuario_guardado["nombre"],
            "email": usuario_guardado["email"],
            "rut": request.rut,
            "patente": usuario_guardado["patente"],
            "token_acceso": "TOKEN_SEGURO_SIMULADO_123",
        },
    }


@app.post("/api/recuperar")
async def recuperar_password(request: RecuperarRequest):
    usuario_guardado = USUARIOS_REGISTRADOS.get(request.rut)

    if not usuario_guardado or usuario_guardado["email"] != request.email:
        raise HTTPException(status_code=404, detail="Los datos no coinciden con ningún usuario registrado.")

    nueva_clave = "nueva123"
    usuario_guardado["password"] = nueva_clave

    correo_enviado = enviar_correo_recuperacion(request.email, nueva_clave)

    if not correo_enviado:
        return {
            "estado": "exito",
            "mensaje": f"Clave restablecida temporalmente a '{nueva_clave}' (el envío de correo real requiere configurar las variables de entorno SMTP).",
        }

    return {
        "estado": "exito",
        "mensaje": f"Se ha enviado un correo con tu nueva contraseña a {request.email}",
    }


# =========================================================
# ENDPOINTS — ESTACIONAMIENTO Y PAGO
# =========================================================
@app.post("/api/estacionamiento/iniciar")
async def iniciar_estacionamiento(request: IniciarEstacionamientoRequest):
    if request.rut not in USUARIOS_REGISTRADOS:
        raise HTTPException(status_code=404, detail="Usuario no registrado")
    if request.sector not in SECTORES_VALIDOS:
        raise HTTPException(status_code=400, detail="Sector inválido")

    sesion_actual = ESTACIONAMIENTOS.get(request.rut)
    if sesion_actual and sesion_actual["estado"] == "activo":
        raise HTTPException(status_code=409, detail="Ya tiene un estacionamiento activo")

    ESTACIONAMIENTOS[request.rut] = {
        "patente": request.patente.upper(),
        "sector": request.sector,
        "hora_inicio": time.time(),
        "hora_salida": None,
        "estado": "activo",
        "tarifa_final": None,
        "pagado": False,
        "comprobante": None,
        "metodo_pago": None,
    }

    return {"estado": "exito", "mensaje": "Estacionamiento iniciado"}


@app.get("/api/estacionamiento/activo/{rut}")
async def obtener_estacionamiento_activo(rut: str):
    sesion = ESTACIONAMIENTOS.get(rut)
    if not sesion:
        raise HTTPException(status_code=404, detail="No hay estacionamiento registrado para este usuario")

    if sesion["estado"] == "activo":
        segundos_transcurridos = time.time() - sesion["hora_inicio"]
        tarifa = calcular_tarifa(segundos_transcurridos)
    else:
        segundos_transcurridos = sesion["hora_salida"] - sesion["hora_inicio"]
        tarifa = sesion["tarifa_final"]

    return {
        "estado": sesion["estado"],
        "patente": sesion["patente"],
        "sector": sesion["sector"],
        "hora_inicio": datetime.fromtimestamp(sesion["hora_inicio"]).isoformat(),
        "hora_salida": (
            datetime.fromtimestamp(sesion["hora_salida"]).isoformat() if sesion["hora_salida"] else None
        ),
        "segundos_transcurridos": int(segundos_transcurridos),
        "tarifa": tarifa,
        "pagado": sesion["pagado"],
        "comprobante": sesion["comprobante"],
    }


@app.post("/api/estacionamiento/finalizar")
async def finalizar_estacionamiento(request: FinalizarEstacionamientoRequest):
    sesion = ESTACIONAMIENTOS.get(request.rut)
    if not sesion or sesion["estado"] != "activo":
        raise HTTPException(status_code=404, detail="No hay un estacionamiento activo para finalizar")

    sesion["hora_salida"] = time.time()
    sesion["estado"] = "finalizado"
    sesion["tarifa_final"] = calcular_tarifa(sesion["hora_salida"] - sesion["hora_inicio"])

    return {
        "estado": "exito",
        "tarifa_final": sesion["tarifa_final"],
    }


@app.post("/api/pago")
async def procesar_pago(request: PagoRequest):
    sesion = ESTACIONAMIENTOS.get(request.rut)
    if not sesion or sesion["estado"] != "finalizado":
        raise HTTPException(status_code=400, detail="No hay un monto pendiente para pagar")
    if sesion["pagado"]:
        raise HTTPException(status_code=409, detail="Este estacionamiento ya fue pagado")

    metodos_validos = ["Tarjeta crédito/débito", "Transferencia bancaria", "Webpay"]
    if request.metodo_pago not in metodos_validos:
        raise HTTPException(status_code=400, detail="Método de pago inválido")

    comprobante = f"PV-{int(time.time() * 1000)}"
    sesion["pagado"] = True
    sesion["comprobante"] = comprobante
    sesion["metodo_pago"] = request.metodo_pago

    return {
        "estado": "exito",
        "comprobante": comprobante,
        "monto": sesion["tarifa_final"],
        "metodo_pago": request.metodo_pago,
    }