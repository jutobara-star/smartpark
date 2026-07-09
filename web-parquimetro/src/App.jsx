import React, { useState, useEffect } from 'react';

// URL del backend. En desarrollo local usa 127.0.0.1:8000.
// En producción, Vite toma el valor de la variable de entorno VITE_API_URL
// que configurarás en Vercel (ej: https://tu-backend.onrender.com)
const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export default function App() {
  const [currentView, setCurrentView] = useState('login'); // 'login', 'dashboard', 'payment', 'success', 'recovery', 'register'
  const [user, setUser] = useState(null);
  
  // --- ESTADOS DEL FORMULARIO ---
  const [email, setEmail] = useState('');
  const [rut, setRut] = useState('');
  const [patente, setPatente] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [codigoRegistro, setCodigoRegistro] = useState('');
  const [emailPendiente, setEmailPendiente] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Parking State
  const [isParking, setIsParking] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [elapsedMinutes, setElapsedMinutes] = useState(0);
  
  // Tarifa: $25 CLP por minuto
  const RATE_PER_MINUTE = 25;

  useEffect(() => {
    let interval;
    if (isParking && startTime) {
      interval = setInterval(() => {
        const now = new Date();
        const diffInMs = now - startTime;
        const diffInMins = Math.floor(diffInMs / 60000);
        setElapsedMinutes(diffInMins);
      }, 1000); // Simulando minutos más rápido para el prototipo
    }
    return () => clearInterval(interval);
  }, [isParking, startTime]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, rut, patente, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Error al iniciar sesión');
      }

      setUser({ 
        name: data.datos_sesion.email.split('@')[0], 
        email: data.datos_sesion.email,
        rut: data.datos_sesion.rut,
        patente: data.datos_sesion.patente
      });
      setCurrentView('dashboard');
      
    } catch (err) {
      if (err instanceof TypeError) {
         setErrorMsg("No se pudo conectar con el servidor. ¿Está Python encendido?");
      } else {
         setErrorMsg(err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecovery = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/recuperar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rut, email }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.detail || 'Error al recuperar contraseña');

      setSuccessMsg(data.mensaje);
      
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/registro/solicitar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, email, rut, patente, telefono, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Error al registrar la cuenta');
      }

      // Guardamos a qué correo se envió el código y pasamos a la vista de verificación
      setEmailPendiente(email);
      setSuccessMsg(data.mensaje);
      setCodigoRegistro('');
      setCurrentView('verify');

    } catch (err) {
      if (err instanceof TypeError) {
        setErrorMsg("No se pudo conectar con el servidor. ¿Está Python encendido?");
      } else {
        setErrorMsg(err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmarCodigo = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/registro/confirmar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailPendiente, codigo: codigoRegistro }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'El código ingresado no es válido');
      }

      // Cuenta creada de verdad: limpiamos todo y devolvemos al login
      setSuccessMsg(data.mensaje);
      setNombre('');
      setTelefono('');
      setPassword('');
      setCodigoRegistro('');
      setEmailPendiente('');
      setCurrentView('login');

    } catch (err) {
      if (err instanceof TypeError) {
        setErrorMsg("No se pudo conectar con el servidor. ¿Está Python encendido?");
      } else {
        setErrorMsg(err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleReenviarCodigo = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/registro/reenviar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailPendiente }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'No se pudo reenviar el código');
      }

      setSuccessMsg(data.mensaje);
    } catch (err) {
      if (err instanceof TypeError) {
        setErrorMsg("No se pudo conectar con el servidor. ¿Está Python encendido?");
      } else {
        setErrorMsg(err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const startParking = () => {
    setStartTime(new Date());
    setIsParking(true);
    setElapsedMinutes(0);
  };

  const stopParking = () => {
    setIsParking(false);
    setCurrentView('payment');
  };

  const processPayment = (e) => {
    e.preventDefault();
    setCurrentView('success');
  };

  const resetApp = () => {
    setStartTime(null);
    setElapsedMinutes(0);
    setCurrentView('dashboard');
  };

  const totalCost = elapsedMinutes * RATE_PER_MINUTE;

  return (
    <>
      {/* VISTA DE LOGIN */}
      {currentView === 'login' && (
        <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center p-4">
          <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex justify-center mb-6">
              <div className="bg-blue-600 p-4 rounded-full text-white text-4xl">
                🚗
              </div>
            </div>
            <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">SmartPark</h1>
            <p className="text-center text-gray-500 mb-6">Inicia sesión con tus datos</p>
            
            {errorMsg && (
              <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4 flex items-start">
                <span className="text-red-500 mr-2 shrink-0 text-xl">⚠️</span>
                <p className="text-sm text-red-700 font-medium">{errorMsg}</p>
              </div>
            )}

            {successMsg && (
              <div className="mb-4 bg-green-50 border-l-4 border-green-500 p-4 flex items-start">
                <span className="text-green-500 mr-2 shrink-0 text-xl">✅</span>
                <p className="text-sm text-green-700 font-medium">{successMsg}</p>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico</label>
                <input 
                  type="email" required
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="tu@correo.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">RUT</label>
                <input 
                  type="text" required
                  value={rut} onChange={(e) => setRut(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="12345678-9"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Patente</label>
                <input 
                  type="text" required
                  value={patente} onChange={(e) => setPatente(e.target.value.toUpperCase())}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none uppercase"
                  placeholder="ABCD-12 o AB-12-34"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                <input 
                  type="password" required
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="••••••••"
                />
              </div>
              <button 
                type="submit" 
                disabled={isLoading}
                className={`w-full text-white font-bold py-3 rounded-lg transition mt-4 ${isLoading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {isLoading ? 'Verificando...' : 'Ingresar'}
              </button>
            </form>
            
            <div className="mt-6 text-center space-y-2">
              <button onClick={() => { setCurrentView('recovery'); setErrorMsg(''); setSuccessMsg(''); }} className="text-sm text-blue-600 hover:underline font-medium block w-full">
                ¿Olvidaste tu contraseña?
              </button>
              <button onClick={() => { setCurrentView('register'); setErrorMsg(''); setSuccessMsg(''); }} className="text-sm text-gray-600 hover:underline font-medium block w-full">
                ¿No tienes cuenta? <span className="text-blue-600 font-bold">Regístrate</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VISTA DE REGISTRO */}
      {currentView === 'register' && (
        <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center p-4">
          <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex justify-center mb-6">
              <div className="bg-blue-600 p-4 rounded-full text-white text-4xl">
                🚗
              </div>
            </div>
            <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">Crear Cuenta</h1>
            <p className="text-center text-gray-500 mb-6">Regístrate para usar SmartPark</p>

            {errorMsg && (
              <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4 flex items-start">
                <span className="text-red-500 mr-2 shrink-0 text-xl">⚠️</span>
                <p className="text-sm text-red-700 font-medium">{errorMsg}</p>
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
                <input
                  type="text" required
                  value={nombre} onChange={(e) => setNombre(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Juan Pérez"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico</label>
                <input
                  type="email" required
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="tu@correo.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">RUT</label>
                <input
                  type="text" required
                  value={rut} onChange={(e) => setRut(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="12345678-9"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Patente</label>
                <input
                  type="text" required
                  value={patente} onChange={(e) => setPatente(e.target.value.toUpperCase())}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none uppercase"
                  placeholder="ABCD-12 o AB-12-34"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono (opcional)</label>
                <input
                  type="text"
                  value={telefono} onChange={(e) => setTelefono(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="+56 9 1234 5678"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                <input
                  type="password" required minLength={6}
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full text-white font-bold py-3 rounded-lg transition mt-4 ${isLoading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {isLoading ? 'Creando cuenta...' : 'Registrarme'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button onClick={() => { setCurrentView('login'); setErrorMsg(''); setSuccessMsg(''); }} className="text-sm text-gray-500 hover:text-gray-800 font-medium">
                ← Volver al inicio de sesión
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VISTA DE VERIFICACIÓN DE CÓDIGO (confirma que el correo es real) */}
      {currentView === 'verify' && (
        <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center p-4">
          <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex justify-center mb-6">
              <div className="bg-blue-600 p-4 rounded-full text-white text-4xl">
                📧
              </div>
            </div>
            <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">Verifica tu correo</h1>
            <p className="text-center text-gray-500 mb-6">
              Enviamos un código a <span className="font-semibold text-gray-700">{emailPendiente}</span>. Ingrésalo para activar tu cuenta.
            </p>

            {errorMsg && (
              <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4 flex items-start">
                <span className="text-red-500 mr-2 shrink-0 text-xl">⚠️</span>
                <p className="text-sm text-red-700 font-medium">{errorMsg}</p>
              </div>
            )}

            {successMsg && (
              <div className="mb-4 bg-green-50 border-l-4 border-green-500 p-4 flex items-start">
                <span className="text-green-500 mr-2 shrink-0 text-xl">✅</span>
                <p className="text-sm text-green-700 font-medium">{successMsg}</p>
              </div>
            )}

            <form onSubmit={handleConfirmarCodigo} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Código de verificación</label>
                <input
                  type="text" required maxLength={6}
                  value={codigoRegistro}
                  onChange={(e) => setCodigoRegistro(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-center text-2xl tracking-[0.5em] font-mono"
                  placeholder="000000"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full text-white font-bold py-3 rounded-lg transition mt-4 ${isLoading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {isLoading ? 'Verificando...' : 'Confirmar cuenta'}
              </button>
            </form>

            <div className="mt-6 text-center space-y-2">
              <button
                onClick={handleReenviarCodigo}
                disabled={isLoading}
                className="text-sm text-blue-600 hover:underline font-medium block w-full"
              >
                Reenviar código
              </button>
              <button
                onClick={() => { setCurrentView('register'); setErrorMsg(''); setSuccessMsg(''); }}
                className="text-sm text-gray-500 hover:text-gray-800 font-medium block w-full"
              >
                ← Corregir mis datos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VISTA DE RECUPERACIÓN DE CONTRASEÑA */}
      {currentView === 'recovery' && (
        <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center p-4">
          <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
            <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">Recuperar Acceso</h2>
            <p className="text-center text-gray-500 mb-6">Ingresa tus datos para restablecer tu contraseña.</p>

            {errorMsg && (
              <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4 flex items-start">
                <span className="text-red-500 mr-2 shrink-0 text-xl">⚠️</span>
                <p className="text-sm text-red-700 font-medium">{errorMsg}</p>
              </div>
            )}

            {successMsg && (
              <div className="mb-4 bg-green-50 border-l-4 border-green-500 p-4 flex items-start">
                <span className="text-green-500 mr-2 shrink-0 text-xl">✅</span>
                <p className="text-sm text-green-700 font-medium">{successMsg}</p>
              </div>
            )}

            <form onSubmit={handleRecovery} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">RUT Registrado</label>
                <input type="text" required value={rut} onChange={(e) => setRut(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="12345678-9" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="tu@correo.com" />
              </div>
              
              <button type="submit" disabled={isLoading} className={`w-full text-white font-bold py-3 rounded-lg transition mt-4 ${isLoading ? 'bg-green-400' : 'bg-green-600 hover:bg-green-700'}`}>
                {isLoading ? 'Buscando...' : 'Restablecer Contraseña'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button onClick={() => { setCurrentView('login'); setErrorMsg(''); setSuccessMsg(''); }} className="text-sm text-gray-500 hover:text-gray-800 font-medium">
                ← Volver al inicio de sesión
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VISTA DEL DASHBOARD */}
      {currentView === 'dashboard' && (
        <div className="min-h-screen bg-gray-50">
          <header className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
            <div className="flex items-center space-x-2 text-blue-600">
              <span className="text-2xl">🚗</span>
              <span className="font-bold text-xl">SmartPark</span>
            </div>
            <button 
              onClick={() => {setUser(null); setCurrentView('login');}}
              className="text-gray-500 hover:text-red-500 flex items-center space-x-1"
            >
              <span className="text-xl">🚪</span>
            </button>
          </header>

          <main className="p-6 max-w-md mx-auto">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
              <div className="flex items-center space-x-3 mb-2 text-gray-800">
                <span className="text-blue-500 text-xl">👤</span>
                <span className="font-bold text-lg">{user?.name}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4 text-sm">
                <div className="bg-gray-50 p-2 rounded border border-gray-100">
                  <span className="block text-gray-400 text-xs">RUT</span>
                  <span className="font-medium text-gray-700">{user?.rut}</span>
                </div>
                <div className="bg-gray-50 p-2 rounded border border-gray-100">
                  <span className="block text-gray-400 text-xs">Patente</span>
                  <span className="font-bold text-blue-600">{user?.patente}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className={`p-6 text-center text-white transition-colors duration-500 ${isParking ? 'bg-green-500' : 'bg-gray-800'}`}>
                <h2 className="text-xl font-bold mb-2">
                  {isParking ? 'Estacionamiento Activo' : 'Parquímetro Libre'}
                </h2>
                <div className="text-5xl font-mono font-light my-4">
                  {isParking 
                    ? `${String(Math.floor(elapsedMinutes / 60)).padStart(2, '0')}:${String(elapsedMinutes % 60).padStart(2, '0')}`
                    : '00:00'}
                </div>
              </div>

              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center space-x-2 text-gray-600">
                    <span className="text-xl">⏱️</span>
                    <span>Tarifa:</span>
                  </div>
                  <span className="font-bold text-gray-800">${RATE_PER_MINUTE} / min</span>
                </div>

                <div className="flex justify-between items-center mb-8 pb-6 border-b border-gray-100">
                  <span className="text-gray-600">Total:</span>
                  <span className="text-3xl font-bold text-blue-600">${totalCost.toLocaleString('es-CL')}</span>
                </div>

                {!isParking ? (
                  <button onClick={startParking} className="w-full bg-green-500 text-white font-bold py-4 rounded-xl hover:bg-green-600 transition shadow-md text-lg">
                    Comenzar a Estacionar
                  </button>
                ) : (
                  <button onClick={stopParking} className="w-full bg-red-500 text-white font-bold py-4 rounded-xl hover:bg-red-600 transition shadow-md text-lg">
                    Finalizar y Pagar
                  </button>
                )}
              </div>
            </div>
          </main>
        </div>
      )}

      {/* VISTA DE PAGO */}
      {currentView === 'payment' && (
        <div className="min-h-screen bg-gray-50 flex flex-col p-4">
          <header className="py-4">
            <button onClick={() => setIsParking(true) || setCurrentView('dashboard')} className="text-blue-600 font-medium">
              ← Volver
            </button>
          </header>
          <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Checkout Seguro</h2>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6 text-center">
              <p className="text-gray-500 mb-2">Total a pagar</p>
              <p className="text-4xl font-bold text-blue-600">${totalCost.toLocaleString('es-CL')}</p>
            </div>
            <form onSubmit={processPayment} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
              <div className="flex items-center space-x-2 text-gray-700 mb-4 font-medium border-b pb-4">
                <span className="text-xl">💳</span>
                <span>Datos de Tarjeta (Simulación)</span>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Número de Tarjeta</label>
                <input type="text" required maxLength="19" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg outline-none font-mono" placeholder="0000 0000 0000 0000" />
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 mt-6">
                Pagar ${totalCost.toLocaleString('es-CL')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* VISTA DE ÉXITO */}
      {currentView === 'success' && (
        <div className="min-h-screen bg-blue-600 flex flex-col justify-center items-center p-6 text-white text-center">
          <span className="mb-6 text-green-300 text-8xl">✅</span>
          <h2 className="text-3xl font-bold mb-2">¡Pago Exitoso!</h2>
          <p className="text-blue-100 mb-8 text-lg">Tu sesión de parquímetro ha finalizado correctamente. La barrera se ha abierto.</p>
          <button onClick={resetApp} className="bg-white text-blue-600 font-bold py-3 px-8 rounded-full hover:bg-blue-50 transition shadow-lg">
            Volver al Inicio
          </button>
        </div>
      )}
    </>
  );
}