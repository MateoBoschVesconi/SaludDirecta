import React, { useState } from 'react';
import { Search, Brain, Activity, Apple, ChevronLeft, ChevronRight, MapPin, Calendar, CreditCard, Clock, FileText } from 'lucide-react';
import Header from './components/Header';
import ProfessionalCard from './components/ProfessionalCard';

// Mock Data
const PROFESSIONALS = [
  { id: 1, name: 'Lic. Mateo Gómez', specialty: 'Kinesiología y Fisiatría', registry: 'MP 3412', price: 25000, description: 'Especialista en rehabilitación traumatológica deportiva y patologías de columna vertebral.', location: 'Resistencia, Chaco' },
  { id: 2, name: 'Dra. Laura Martínez', specialty: 'Nutrición', registry: 'MP 1845', price: 18000, description: 'Nutrición clínica y deportiva. Acompañamiento integral.', location: 'Resistencia, Chaco' },
  { id: 3, name: 'Lic. Nicolás Valenzuela', specialty: 'Psicología', registry: 'MP 2990', price: 30000, description: 'Psicología cognitivo-conductual. Jóvenes y adultos.', location: 'Resistencia, Chaco' },
];

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('home'); // home, results, profile, booking, checkout, success
  const [selectedPro, setSelectedPro] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');

  const renderHome = () => (
    <div className="max-w-2xl mx-auto mt-12 px-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h1 className="text-4xl font-bold text-text-main mb-2 tracking-tight">
        Encontrá tu <span className="text-primary">profesional particular</span>
      </h1>
      <p className="text-gray-500 mb-8">
        Matrículas oficiales verificadas ante SISA / REFEPS
      </p>

      <div className="card p-2 mb-8 flex items-center shadow-md">
        <Search className="w-5 h-5 text-gray-400 ml-3" />
        <input 
          type="text" 
          placeholder="Kinesiología y Fisiatría" 
          className="flex-1 border-none focus:ring-0 px-4 py-3 bg-transparent text-text-main outline-none"
        />
        <button 
          onClick={() => setCurrentScreen('results')}
          className="bg-primary text-white px-8 py-3 rounded-lg font-medium hover:bg-sky-700 transition-colors shadow-sm"
        >
          Buscar
        </button>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Especialidades destacadas</h3>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 bg-white border border-borderSubtle px-4 py-2 rounded-full text-sm font-medium hover:border-primary hover:text-primary transition-colors shadow-sm">
            <Activity className="w-4 h-4 text-primary" /> Kinesio
          </button>
          <button className="flex items-center gap-2 bg-white border border-borderSubtle px-4 py-2 rounded-full text-sm font-medium hover:border-primary hover:text-primary transition-colors shadow-sm">
            <Apple className="w-4 h-4 text-emerald-500" /> Nutrición
          </button>
          <button className="flex items-center gap-2 bg-white border border-borderSubtle px-4 py-2 rounded-full text-sm font-medium hover:border-primary hover:text-primary transition-colors shadow-sm">
            <Brain className="w-4 h-4 text-purple-500" /> Psico
          </button>
        </div>
      </div>
    </div>
  );

  const renderResults = () => (
    <div className="max-w-3xl mx-auto mt-8 px-4 animate-in fade-in duration-300">
      <div className="flex items-center justify-between mb-6">
        <div>
          <button onClick={() => setCurrentScreen('home')} className="text-gray-500 hover:text-text-main flex items-center text-sm font-medium mb-2 transition-colors">
            <ChevronLeft className="w-4 h-4 mr-1" /> Volver
          </button>
          <h2 className="text-2xl font-bold text-text-main">3 profesionales disponibles</h2>
          <p className="text-gray-500 flex items-center text-sm mt-1">
            <MapPin className="w-4 h-4 mr-1" /> Resistencia, Chaco
          </p>
        </div>
        <button className="flex items-center gap-2 bg-white border border-borderSubtle px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 shadow-sm transition-colors">
           Filtros
        </button>
      </div>

      <div className="flex flex-col gap-4">
        {PROFESSIONALS.map(pro => (
          <ProfessionalCard 
            key={pro.id} 
            {...pro} 
            onClick={() => {
              setSelectedPro(pro);
              setCurrentScreen('profile');
            }} 
          />
        ))}
      </div>
    </div>
  );

  const renderProfile = () => {
    if (!selectedPro) return null;
    const initials = selectedPro.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

    return (
      <div className="max-w-3xl mx-auto mt-8 px-4 animate-in slide-in-from-right-8 duration-300">
        <button onClick={() => setCurrentScreen('results')} className="text-gray-500 hover:text-text-main flex items-center text-sm font-medium mb-6 transition-colors">
          <ChevronLeft className="w-4 h-4 mr-1" /> Volver a resultados
        </button>

        <div className="card mb-6">
          <div className="flex gap-5 items-center mb-6">
            <div className="w-20 h-20 rounded-full bg-primary text-white flex items-center justify-center font-bold text-2xl shadow-md">
              {initials}
            </div>
            <div>
              <h1 className="font-bold text-2xl text-text-main">{selectedPro.name}</h1>
              <p className="text-gray-500 mb-2">{selectedPro.specialty} · {selectedPro.registry}</p>
              <div className="badge-success inline-flex">Matrícula Verificada SISA</div>
            </div>
          </div>
          
          <p className="text-text-main mb-6 leading-relaxed">
            {selectedPro.description}
          </p>

          <div className="border-t border-borderSubtle pt-6">
            <div className="flex justify-between items-center mb-4 p-4 rounded-xl border-2 border-primary bg-sky-50 cursor-pointer">
              <div>
                <div className="font-bold text-text-main">Consulta Individual</div>
                <div className="text-sm text-gray-500">Atención presencial en consultorio</div>
              </div>
              <div className="text-right">
                <div className="font-bold text-xl text-primary">$ {selectedPro.price.toLocaleString('es-AR')}</div>
              </div>
            </div>
            
            <div className="flex justify-between items-center p-4 rounded-xl border border-borderSubtle hover:border-gray-300 cursor-pointer transition-colors">
              <div>
                <div className="font-bold text-text-main">Paquete 8 Sesiones</div>
                <div className="text-sm text-gray-500">Tratamiento prolongado</div>
              </div>
              <div className="text-right">
                <div className="font-bold text-xl text-text-main">$ {(selectedPro.price * 8 * 0.84).toLocaleString('es-AR')}</div>
                <div className="text-xs text-green-600 font-medium">16% de descuento</div>
              </div>
            </div>
          </div>
        </div>

        <button 
          onClick={() => setCurrentScreen('booking')}
          className="btn-primary text-lg"
        >
          Reservar Turno Directo
        </button>
      </div>
    );
  };

  const renderBooking = () => {
    if (!selectedPro) return null;
    return (
    <div className="max-w-2xl mx-auto mt-8 px-4 animate-in fade-in duration-300">
      <button onClick={() => setCurrentScreen('profile')} className="text-gray-500 hover:text-text-main flex items-center text-sm font-medium mb-6 transition-colors">
        <ChevronLeft className="w-4 h-4 mr-1" /> Volver al perfil
      </button>

      <h2 className="text-2xl font-bold text-text-main mb-6 flex items-center gap-2">
        <Calendar className="text-primary" /> Seleccione fecha
      </h2>

      <div className="card mb-6">
        <div className="font-medium text-text-main mb-4">Octubre 2026</div>
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {['Jue 01', 'Vie 02', 'Lun 05', 'Mar 06', 'Mié 07'].map((day) => (
            <button 
              key={day} 
              onClick={() => setSelectedDate(day)}
              className={`flex-shrink-0 w-16 py-3 rounded-lg border text-center font-medium transition-colors ${selectedDate === day ? 'bg-primary border-primary text-white shadow-sm' : 'border-borderSubtle text-text-main hover:border-primary'}`}
            >
              <div className="text-xs opacity-80">{day.split(' ')[0]}</div>
              <div className="text-lg">{day.split(' ')[1]}</div>
            </button>
          ))}
        </div>

        <div className="font-medium text-text-main mb-4">Horarios disponibles</div>
        <div className="grid grid-cols-3 gap-3">
          {['09:00 hs', '10:30 hs', '11:30 hs'].map((time) => (
            <button 
              key={time} 
              onClick={() => setSelectedTime(time)}
              className={`py-3 rounded-lg border text-center font-medium transition-colors ${selectedTime === time ? 'bg-sky-50 border-primary text-primary font-bold' : 'border-borderSubtle text-text-main hover:border-gray-400'}`}
            >
              {time}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-borderSubtle shadow-sm mb-6 sticky bottom-4">
        <div>
          <div className="text-sm text-gray-500">Total a pagar</div>
          <div className="font-bold text-xl text-text-main">$ {selectedPro?.price.toLocaleString('es-AR')}</div>
        </div>
        <button 
          onClick={() => {
            if (selectedDate && selectedTime) setCurrentScreen('checkout');
          }} 
          disabled={!selectedDate || !selectedTime}
          className={`${(!selectedDate || !selectedTime) ? 'bg-gray-300 cursor-not-allowed' : 'bg-primary hover:bg-sky-700 shadow-sm'} text-white px-8 py-3 rounded-lg font-medium transition-colors flex items-center gap-2`}
        >
          Continuar <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
  };

  const renderCheckout = () => {
    if (!selectedPro) return null;
    return (
    <div className="max-w-2xl mx-auto mt-8 px-4 animate-in fade-in duration-300">
      <button onClick={() => setCurrentScreen('booking')} className="text-gray-500 hover:text-text-main flex items-center text-sm font-medium mb-6 transition-colors">
        <ChevronLeft className="w-4 h-4 mr-1" /> Volver
      </button>

      <h2 className="text-2xl font-bold text-text-main mb-6">Resumen de la consulta</h2>

      <div className="card mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="font-bold text-lg text-text-main">{selectedPro?.specialty} (Particular)</h3>
            <p className="text-primary font-medium flex items-center gap-1 mt-1">
              <Calendar className="w-4 h-4" /> {selectedDate} Oct 2026 · {selectedTime}
            </p>
            <p className="text-gray-500 text-sm mt-1">{selectedPro?.name}</p>
          </div>
        </div>
        
        <div className="border-t border-borderSubtle pt-4 flex justify-between items-center mb-4">
          <div className="font-bold text-text-main">Total a pagar:</div>
          <div className="font-bold text-xl text-primary">$ {selectedPro?.price.toLocaleString('es-AR')}</div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 border border-borderSubtle flex items-center gap-3">
          <CreditCard className="text-gray-500" />
          <div className="text-sm text-gray-600 font-medium">Pasarela Mercado Pago / Débito habilitada</div>
        </div>
      </div>

      <button onClick={() => setCurrentScreen('success')} className="w-full bg-medical-success text-white py-4 rounded-xl font-bold text-lg hover:bg-emerald-600 transition-colors shadow-md">
        Pagar y Descargar Comprobante
      </button>
    </div>
  );
  };

  const renderSuccess = () => {
    if (!selectedPro) return null;
    return (
    <div className="max-w-3xl mx-auto mt-8 px-4 animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-8 border-b border-borderSubtle pb-4">
        <h2 className="text-2xl font-bold text-text-main">Mis Turnos</h2>
        <div className="badge-success px-3 py-1.5 text-sm">Portal del Paciente</div>
      </div>

      <div className="card border-l-4 border-l-primary relative overflow-hidden mb-4 group">
        <div className="absolute top-0 right-0 bg-sky-100 text-primary px-3 py-1 text-xs font-bold rounded-bl-lg">Confirmado</div>
        <div className="flex gap-4 items-start">
          <div className="bg-sky-50 p-3 rounded-lg">
            <Clock className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg text-text-main mb-1">{selectedDate} Oct · {selectedTime}</h3>
            <p className="text-gray-600 font-medium">{selectedPro?.name} · {selectedPro?.specialty}</p>
            
            <div className="mt-4 flex gap-4 text-sm">
              <button className="flex items-center gap-1 text-primary hover:underline font-medium">
                <FileText className="w-4 h-4" /> Comprobante
              </button>
              <span className="text-gray-300">|</span>
              <button className="text-gray-500 hover:text-text-main font-medium transition-colors">
                Reprogramar
              </button>
            </div>
          </div>
        </div>
      </div>

      <button onClick={() => setCurrentScreen('home')} className="mt-8 text-primary font-medium hover:underline mx-auto block">
        Volver al inicio
      </button>
    </div>
  );
  };

  return (
    <div className="min-h-screen bg-canvas pb-20">
      <Header />
      
      <main>
        {currentScreen === 'home' && renderHome()}
        {currentScreen === 'results' && renderResults()}
        {currentScreen === 'profile' && renderProfile()}
        {currentScreen === 'booking' && renderBooking()}
        {currentScreen === 'checkout' && renderCheckout()}
        {currentScreen === 'success' && renderSuccess()}
      </main>
    </div>
  );
}
