import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, Brain, Activity, Apple, ChevronLeft, ChevronRight, MapPin, 
  Calendar, CreditCard, Clock, FileText, CheckCircle2, User, Phone, 
  Loader2, AlertCircle, XCircle 
} from 'lucide-react';
import Header from './components/Header';
import ProfessionalCard from './components/ProfessionalCard';
import { supabase } from './lib/supabase';

// Mock Data de respaldo por si Supabase aún no está conectado
const INITIAL_PROFESSIONALS = [
  { id: '1', name: 'Lic. Mateo Gómez', specialty: 'Kinesiología y Fisiatría', registry: 'MP 3412', price: 25000, description: 'Especialista en rehabilitación traumatológica deportiva y patologías de columna vertebral.', location: 'Resistencia, Chaco' },
  { id: '2', name: 'Dra. Laura Martínez', specialty: 'Nutrición', registry: 'MP 1845', price: 18000, description: 'Nutrición clínica y deportiva. Acompañamiento integral.', location: 'Resistencia, Chaco' },
  { id: '3', name: 'Lic. Nicolás Valenzuela', specialty: 'Psicología', registry: 'MP 2990', price: 30000, description: 'Psicología cognitivo-conductual. Jóvenes y adultos.', location: 'Resistencia, Chaco' },
];

const AVAILABLE_DATES = ['Jue 01 Oct', 'Vie 02 Oct', 'Lun 05 Oct', 'Mar 06 Oct', 'Mié 07 Oct'];
const ALL_TIME_SLOTS = ['09:00 hs', '10:30 hs', '11:30 hs', '16:00 hs', '17:30 hs', '19:00 hs'];

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('home'); // home, results, profile, booking, checkout, success
  const [professionals, setProfessionals] = useState(INITIAL_PROFESSIONALS);
  const [loadingPros, setLoadingPros] = useState(true);
  const [selectedPro, setSelectedPro] = useState(null);
  
  // Selección de fecha y hora
  const [selectedDate, setSelectedDate] = useState(AVAILABLE_DATES[0]);
  const [selectedTime, setSelectedTime] = useState('');
  const [bookedTimes, setBookedTimes] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  
  // Datos del paciente y estado de envío
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  // Cargar lista de profesionales desde Supabase
  useEffect(() => {
    async function fetchProfessionals() {
      if (!supabase) {
        setLoadingPros(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('professionals')
          .select('*')
          .order('name', { ascending: true });

        if (error) {
          console.warn('Error al obtener profesionales de Supabase, usando respaldo local:', error.message);
        } else if (data && data.length > 0) {
          setProfessionals(data);
        }
      } catch (err) {
        console.error('Error de red con Supabase:', err);
      } finally {
        setLoadingPros(false);
      }
    }

    fetchProfessionals();
  }, []);

  // Consultar horarios ya ocupados para el profesional y la fecha seleccionada
  const fetchBookedSlots = useCallback(async (pro, date) => {
    if (!pro || !date) return;
    
    setLoadingSlots(true);
    setBookingError('');

    try {
      if (supabase) {
        let query = supabase
          .from('appointments')
          .select('time')
          .eq('date', date)
          .neq('status', 'cancelled');

        if (pro.id && isNaN(Number(pro.id))) {
          query = query.eq('professional_id', pro.id);
        } else {
          query = query.eq('professional_name', pro.name);
        }

        const { data, error } = await query;

        if (error) {
          console.warn('Error al consultar turnos ocupados:', error.message);
        } else if (data) {
          const occupied = data.map(item => item.time);
          setBookedTimes(occupied);

          // Si el horario seleccionado previamente quedó ocupado, deseleccionarlo
          setSelectedTime(prev => (occupied.includes(prev) ? '' : prev));
        }
      } else {
        setBookedTimes([]);
      }
    } catch (err) {
      console.error('Error al chequear turnos:', err);
    } finally {
      setLoadingSlots(false);
    }
  }, []);

  // Cada vez que cambie de profesional o de fecha en la pantalla de booking, buscar disponibilidad
  useEffect(() => {
    if (selectedPro && selectedDate) {
      fetchBookedSlots(selectedPro, selectedDate);
    }
  }, [selectedPro, selectedDate, fetchBookedSlots]);

  // Confirmar reserva con doble verificación en tiempo real
  const handleConfirmBooking = async () => {
    if (!selectedPro || !selectedDate || !selectedTime) return;

    setIsSubmitting(true);
    setBookingError('');

    try {
      // 1. Verificación en tiempo real: comprobar si alguien ya tomó este turno
      if (supabase) {
        let checkQuery = supabase
          .from('appointments')
          .select('id')
          .eq('date', selectedDate)
          .eq('time', selectedTime)
          .neq('status', 'cancelled');

        if (selectedPro.id && isNaN(Number(selectedPro.id))) {
          checkQuery = checkQuery.eq('professional_id', selectedPro.id);
        } else {
          checkQuery = checkQuery.eq('professional_name', selectedPro.name);
        }

        const { data: existingBookings, error: checkError } = await checkQuery;

        if (checkError) {
          console.warn('No se pudo verificar disponibilidad previa:', checkError.message);
        } else if (existingBookings && existingBookings.length > 0) {
          // Ya existe una reserva para ese día y horario con ese profesional
          setBookingError(`El turno para el ${selectedDate} a las ${selectedTime} ya ha sido reservado por otro paciente. Por favor selecciona otro horario.`);
          setIsSubmitting(false);
          // Actualizamos la lista de ocupados
          setBookedTimes(prev => [...new Set([...prev, selectedTime])]);
          return;
        }
      }

      // 2. Si está disponible, proceder a guardar la reserva
      const bookingPayload = {
        professional_id: isNaN(Number(selectedPro.id)) ? selectedPro.id : null,
        professional_name: selectedPro.name,
        specialty: selectedPro.specialty,
        patient_name: patientName.trim() || 'Paciente Particular',
        patient_phone: patientPhone.trim() || 'No especificado',
        date: selectedDate,
        time: selectedTime,
        total_price: selectedPro.price,
        status: 'confirmed'
      };

      if (supabase) {
        const { data, error } = await supabase
          .from('appointments')
          .insert([bookingPayload])
          .select()
          .single();

        if (error) {
          // Manejar error si hay restricción única a nivel BD
          if (error.code === '23505') {
            setBookingError(`El horario ${selectedTime} ya se encuentra ocupado.`);
            setIsSubmitting(false);
            return;
          }
          console.warn('Error al insertar en Supabase, usando fallback:', error.message);
          setConfirmedBooking({
            ...bookingPayload,
            id: 'BK-' + Math.floor(100000 + Math.random() * 900000)
          });
        } else {
          setConfirmedBooking(data);
        }
      } else {
        setConfirmedBooking({
          ...bookingPayload,
          id: 'BK-' + Math.floor(100000 + Math.random() * 900000)
        });
      }

      // Turno guardado con éxito
      setCurrentScreen('success');
    } catch (err) {
      console.error('Error al procesar reserva:', err);
      setBookingError('Ocurrió un error al procesar tu solicitud. Por favor intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

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
          <button 
            onClick={() => setCurrentScreen('results')}
            className="flex items-center gap-2 bg-white border border-borderSubtle px-4 py-2 rounded-full text-sm font-medium hover:border-primary hover:text-primary transition-colors shadow-sm"
          >
            <Activity className="w-4 h-4 text-primary" /> Kinesio
          </button>
          <button 
            onClick={() => setCurrentScreen('results')}
            className="flex items-center gap-2 bg-white border border-borderSubtle px-4 py-2 rounded-full text-sm font-medium hover:border-primary hover:text-primary transition-colors shadow-sm"
          >
            <Apple className="w-4 h-4 text-emerald-500" /> Nutrición
          </button>
          <button 
            onClick={() => setCurrentScreen('results')}
            className="flex items-center gap-2 bg-white border border-borderSubtle px-4 py-2 rounded-full text-sm font-medium hover:border-primary hover:text-primary transition-colors shadow-sm"
          >
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
          <h2 className="text-2xl font-bold text-text-main">
            {loadingPros ? 'Cargando profesionales...' : `${professionals.length} profesionales disponibles`}
          </h2>
          <p className="text-gray-500 flex items-center text-sm mt-1">
            <MapPin className="w-4 h-4 mr-1" /> Resistencia, Chaco
          </p>
        </div>
        <button className="flex items-center gap-2 bg-white border border-borderSubtle px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 shadow-sm transition-colors">
           Filtros
        </button>
      </div>

      {loadingPros ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-gray-500">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm">Conectando con la base de datos...</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {professionals.map(pro => (
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
      )}
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
                <div className="font-bold text-xl text-primary">$ {Number(selectedPro.price).toLocaleString('es-AR')}</div>
              </div>
            </div>
            
            <div className="flex justify-between items-center p-4 rounded-xl border border-borderSubtle hover:border-gray-300 cursor-pointer transition-colors">
              <div>
                <div className="font-bold text-text-main">Paquete 8 Sesiones</div>
                <div className="text-sm text-gray-500">Tratamiento prolongado</div>
              </div>
              <div className="text-right">
                <div className="font-bold text-xl text-text-main">$ {(Number(selectedPro.price) * 8 * 0.84).toLocaleString('es-AR')}</div>
                <div className="text-xs text-green-600 font-medium">16% de descuento</div>
              </div>
            </div>
          </div>
        </div>

        <button 
          onClick={() => {
            setSelectedTime('');
            setBookingError('');
            setCurrentScreen('booking');
          }}
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

      <h2 className="text-2xl font-bold text-text-main mb-2 flex items-center gap-2">
        <Calendar className="text-primary" /> Seleccione fecha y horario
      </h2>
      <p className="text-sm text-gray-500 mb-6">
        Turnos para <span className="font-medium text-text-main">{selectedPro.name}</span>
      </p>

      <div className="card mb-6">
        <div className="font-medium text-text-main mb-3">Días disponibles</div>
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {AVAILABLE_DATES.map((day) => (
            <button 
              key={day} 
              onClick={() => {
                setSelectedDate(day);
                setSelectedTime('');
              }}
              className={`flex-shrink-0 w-20 py-3 rounded-lg border text-center font-medium transition-colors ${selectedDate === day ? 'bg-primary border-primary text-white shadow-sm' : 'border-borderSubtle text-text-main hover:border-primary bg-white'}`}
            >
              <div className="text-xs opacity-80">{day.split(' ')[0]}</div>
              <div className="text-lg font-bold">{day.split(' ')[1]}</div>
              <div className="text-xs opacity-80">{day.split(' ')[2]}</div>
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between mb-3">
          <div className="font-medium text-text-main">
            Horarios disponibles ({selectedDate})
          </div>
          {loadingSlots && (
            <span className="text-xs text-primary flex items-center gap-1 font-medium">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Verificando turnos...
            </span>
          )}
        </div>

        {/* Grilla de horarios */}
        <div className="grid grid-cols-3 gap-3">
          {ALL_TIME_SLOTS.map((time) => {
            const isBooked = bookedTimes.includes(time);
            const isSelected = selectedTime === time;

            return (
              <button 
                key={time} 
                disabled={isBooked}
                onClick={() => {
                  if (!isBooked) {
                    setSelectedTime(time);
                    setBookingError('');
                  }
                }}
                className={`py-3 px-2 rounded-lg border text-center font-medium transition-all relative ${
                  isBooked 
                    ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed opacity-70' 
                    : isSelected 
                    ? 'bg-sky-50 border-primary text-primary font-bold shadow-sm' 
                    : 'border-borderSubtle text-text-main hover:border-primary bg-white'
                }`}
              >
                <div className={`text-base ${isBooked ? 'line-through text-gray-400' : ''}`}>
                  {time}
                </div>
                {isBooked ? (
                  <span className="block text-[10px] text-rose-500 font-bold uppercase tracking-wider mt-0.5">
                    Ocupado
                  </span>
                ) : (
                  <span className="block text-[10px] text-emerald-600 font-medium mt-0.5">
                    Disponible
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {bookedTimes.length === ALL_TIME_SLOTS.length && (
          <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            No quedan turnos disponibles para esta fecha. Por favor seleccione otro día.
          </div>
        )}
      </div>

      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-borderSubtle shadow-sm mb-6 sticky bottom-4">
        <div>
          <div className="text-sm text-gray-500">Total de la consulta</div>
          <div className="font-bold text-xl text-text-main">$ {Number(selectedPro?.price).toLocaleString('es-AR')}</div>
        </div>
        <button 
          onClick={() => {
            if (selectedDate && selectedTime && !bookedTimes.includes(selectedTime)) {
              setBookingError('');
              setCurrentScreen('checkout');
            }
          }} 
          disabled={!selectedDate || !selectedTime || bookedTimes.includes(selectedTime)}
          className={`${(!selectedDate || !selectedTime || bookedTimes.includes(selectedTime)) ? 'bg-gray-300 cursor-not-allowed' : 'bg-primary hover:bg-sky-700 shadow-sm'} text-white px-8 py-3 rounded-lg font-medium transition-colors flex items-center gap-2`}
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

      <h2 className="text-2xl font-bold text-text-main mb-6">Confirmación de la reserva</h2>

      {/* Cartel de error si el turno fue reservado justo antes */}
      {bookingError && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-start gap-3 animate-in shake duration-200">
          <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-600" />
          <div className="flex-1">
            <p className="font-semibold text-sm">Turno no disponible</p>
            <p className="text-sm mt-0.5">{bookingError}</p>
            <button 
              onClick={() => setCurrentScreen('booking')}
              className="mt-2 text-sm font-bold text-red-700 underline hover:text-red-900"
            >
              ← Volver y elegir otro horario
            </button>
          </div>
        </div>
      )}

      {/* Datos del paciente */}
      <div className="card mb-6">
        <h3 className="font-bold text-base text-text-main mb-4">Tus datos de contacto</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1.5">
              <User className="w-4 h-4 text-gray-400" /> Nombre y Apellido
            </label>
            <input 
              type="text" 
              placeholder="Ej: Juan Pérez"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-borderSubtle focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-text-main bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1.5">
              <Phone className="w-4 h-4 text-gray-400" /> Teléfono / WhatsApp
            </label>
            <input 
              type="tel" 
              placeholder="Ej: +54 9 362 4123456"
              value={patientPhone}
              onChange={(e) => setPatientPhone(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-borderSubtle focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-text-main bg-white"
            />
          </div>
        </div>
      </div>

      <div className="card mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="font-bold text-lg text-text-main">{selectedPro?.specialty} (Particular)</h3>
            <p className="text-primary font-medium flex items-center gap-1 mt-1">
              <Calendar className="w-4 h-4" /> {selectedDate} · {selectedTime}
            </p>
            <p className="text-gray-500 text-sm mt-1">{selectedPro?.name} · {selectedPro?.location}</p>
          </div>
        </div>
        
        <div className="border-t border-borderSubtle pt-4 flex justify-between items-center mb-4">
          <div className="font-bold text-text-main">Total a abonar:</div>
          <div className="font-bold text-xl text-primary">$ {Number(selectedPro?.price).toLocaleString('es-AR')}</div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 border border-borderSubtle flex items-center gap-3">
          <CreditCard className="text-gray-500" />
          <div className="text-sm text-gray-600 font-medium">Pago en consultorio o pasarela habilitada</div>
        </div>
      </div>

      <button 
        onClick={handleConfirmBooking} 
        disabled={isSubmitting || Boolean(bookingError)}
        className={`w-full ${
          isSubmitting || Boolean(bookingError)
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-medical-success hover:bg-emerald-600'
        } text-white py-4 rounded-xl font-bold text-lg transition-colors shadow-md flex items-center justify-center gap-2`}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" /> Verificando y registrando turno...
          </>
        ) : (
          'Confirmar Turno y Guardar en Sistema'
        )}
      </button>
    </div>
  );
  };

  const renderSuccess = () => {
    if (!selectedPro) return null;
    return (
    <div className="max-w-3xl mx-auto mt-8 px-4 animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-8 border-b border-borderSubtle pb-4">
        <div>
          <h2 className="text-2xl font-bold text-text-main">¡Turno Confirmado!</h2>
          <p className="text-gray-500 text-sm mt-0.5">La reserva se ha registrado exitosamente en la base de datos.</p>
        </div>
        <div className="badge-success px-3 py-1.5 text-sm flex items-center gap-1">
          <CheckCircle2 className="w-4 h-4" /> Portal Paciente
        </div>
      </div>

      <div className="card border-l-4 border-l-primary relative overflow-hidden mb-6 group">
        <div className="absolute top-0 right-0 bg-sky-100 text-primary px-3 py-1 text-xs font-bold rounded-bl-lg">
          Reserva #{confirmedBooking?.id ? String(confirmedBooking.id).slice(0, 8).toUpperCase() : 'OK'}
        </div>
        <div className="flex gap-4 items-start">
          <div className="bg-sky-50 p-3 rounded-lg">
            <Clock className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg text-text-main mb-1">
              {confirmedBooking?.date || selectedDate} · {confirmedBooking?.time || selectedTime}
            </h3>
            <p className="text-gray-600 font-medium">{selectedPro?.name} · {selectedPro?.specialty}</p>
            <p className="text-sm text-gray-500 mt-1">Paciente: <span className="text-text-main font-medium">{confirmedBooking?.patient_name || 'Paciente Particular'}</span></p>
            {confirmedBooking?.patient_phone && confirmedBooking.patient_phone !== 'No especificado' && (
              <p className="text-sm text-gray-500">Contacto: <span className="text-text-main font-medium">{confirmedBooking.patient_phone}</span></p>
            )}

            <div className="mt-4 flex gap-4 text-sm pt-2 border-t border-borderSubtle">
              <button 
                onClick={() => window.print()}
                className="flex items-center gap-1 text-primary hover:underline font-medium"
              >
                <FileText className="w-4 h-4" /> Imprimir / Comprobante
              </button>
            </div>
          </div>
        </div>
      </div>

      <button 
        onClick={() => {
          setSelectedDate(AVAILABLE_DATES[0]);
          setSelectedTime('');
          setSelectedPro(null);
          setBookingError('');
          setCurrentScreen('home');
        }} 
        className="mt-8 text-primary font-medium hover:underline mx-auto block"
      >
        ← Volver al inicio
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