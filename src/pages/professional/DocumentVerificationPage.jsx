import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Trash2, 
  RefreshCw, 
  ShieldCheck, 
  FileCheck2, 
  Clock, 
  HelpCircle,
  File,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function DocumentVerificationPage() {
  const { user } = useAuth();
  const fileInputRef = useRef(null);

  // Datos declarados previamente por el profesional (HU2)
  const declaredData = {
    name: user?.nombre || 'Lic. Mateo Gómez',
    registry: 'MP 3412',
    profession: 'Kinesiología y Fisiatría',
    jurisdiction: 'Chaco',
  };

  // Estados del archivo y procesamiento OCR
  const [docType, setDocType] = useState('credencial'); // 'credencial' | 'titulo'
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [ocrResult, setOcrResult] = useState(null);
  const [simulationMode, setSimulationMode] = useState('match'); // 'match' | 'mismatch'
  const [auditSent, setAuditSent] = useState(false);

  // Documentos cargados previamente
  const [documentHistory, setDocumentHistory] = useState([
    {
      id: 'DOC-101',
      type: 'Credencial Profesional (Frente y Dorso)',
      filename: 'credencial_kinesio_chaco.jpg',
      size: '1.8 MB',
      uploadDate: '2026-10-28',
      status: 'validado',
      ocrConfidence: '98%',
      details: 'Matrícula MP 3412 validada con Colegio de Kinesiólogos del Chaco.'
    }
  ]);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = (selectedFile) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(selectedFile.type)) {
      alert('Formato de archivo no admitido. Por favor seleccioná un archivo PDF, JPG o PNG.');
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      alert('El archivo supera el tamaño máximo permitido de 10 MB.');
      return;
    }

    setFile(selectedFile);
    setOcrResult(null);
    setAuditSent(false);

    if (selectedFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setFilePreview(e.target.result);
      reader.readAsDataURL(selectedFile);
    } else {
      setFilePreview(null);
    }

    // Iniciar simulación de procesamiento OCR
    startOcrProcessing();
  };

  const startOcrProcessing = () => {
    setIsProcessing(true);
    setProcessingStep('Cargando documento en el motor OCR...');

    setTimeout(() => {
      setProcessingStep('Extrayendo capas de texto con Tesseract OCR...');
    }, 900);

    setTimeout(() => {
      setProcessingStep('Contrastando datos con el padrón oficial REFEPS / SISA...');
    }, 1800);

    setTimeout(() => {
      setIsProcessing(false);
      setProcessingStep('');

      if (simulationMode === 'match') {
        // Simulación: Coincidencia 100% exitosa
        setOcrResult({
          status: 'success',
          extractedName: declaredData.name.toUpperCase(),
          extractedRegistry: declaredData.registry,
          extractedProfession: 'LICENCIATURA EN KINESIOLOGÍA Y FISIATRÍA',
          extractedEntity: 'COLEGIO DE KINESIÓLOGOS Y FISIOTERAPEUTAS DEL CHACO',
          extractedDate: '15/03/2018',
          confidenceScore: 97.4,
          matches: {
            name: true,
            registry: true,
            profession: true,
          }
        });
      } else {
        // Simulación: Discrepancia que deriva a revisión manual
        setOcrResult({
          status: 'mismatch',
          extractedName: declaredData.name.toUpperCase(),
          extractedRegistry: 'MP 3488', // Discrepancia intencional
          extractedProfession: 'LICENCIATURA EN KINESIOLOGÍA Y FISIATRÍA',
          extractedEntity: 'COLEGIO DE KINESIÓLOGOS Y FISIOTERAPEUTAS DEL CHACO',
          extractedDate: '15/03/2018',
          confidenceScore: 84.1,
          matches: {
            name: true,
            registry: false,
            profession: true,
          },
          discrepancyReason: 'El número de matrícula extraído (MP 3488) no coincide exactamente con el valor declarado en tu perfil (MP 3412).'
        });
      }
    }, 2800);
  };

  const handleConfirmValid = () => {
    if (!ocrResult || !file) return;

    const newDoc = {
      id: 'DOC-' + Math.floor(100 + Math.random() * 900),
      type: docType === 'credencial' ? 'Credencial Profesional Oficial' : 'Título Universitario de Grado',
      filename: file.name,
      size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
      uploadDate: new Date().toISOString().split('T')[0],
      status: 'validado',
      ocrConfidence: ocrResult.confidenceScore + '%',
      details: 'Validado automáticamente por coincidencia de matrícula y datos.'
    };

    setDocumentHistory([newDoc, ...documentHistory]);
    setFile(null);
    setFilePreview(null);
    setOcrResult(null);

    // Actualizar el perfil en localStorage para reflejar estado verificado
    const proProfile = JSON.parse(localStorage.getItem('salud_directa_pro_profile') || '{}');
    proProfile.verificationStatus = 'verificado';
    localStorage.setItem('salud_directa_pro_profile', JSON.stringify(proProfile));

    alert('¡Documentación validada con éxito! Tu perfil ahora cuenta con el distintivo oficial de Profesional Verificado.');
  };

  const handleSendToManualReview = () => {
    setAuditSent(true);
    const newDoc = {
      id: 'DOC-' + Math.floor(100 + Math.random() * 900),
      type: docType === 'credencial' ? 'Credencial Profesional Oficial' : 'Título Universitario de Grado',
      filename: file.name,
      size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
      uploadDate: new Date().toISOString().split('T')[0],
      status: 'revision_manual',
      ocrConfidence: ocrResult.confidenceScore + '%',
      details: 'Expediente remitido a auditoría humana por discrepancia en OCR.'
    };

    setDocumentHistory([newDoc, ...documentHistory]);

    // Actualizar el perfil a "observado" o "pendiente"
    const proProfile = JSON.parse(localStorage.getItem('salud_directa_pro_profile') || '{}');
    proProfile.verificationStatus = 'pendiente';
    localStorage.setItem('salud_directa_pro_profile', JSON.stringify(proProfile));
  };

  const handleRemoveFile = () => {
    setFile(null);
    setFilePreview(null);
    setOcrResult(null);
    setAuditSent(false);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16 animate-in fade-in duration-300">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-borderSubtle">
        <div>
          <h1 className="text-2xl font-bold text-text-main flex items-center gap-2">
            <FileCheck2 className="w-6 h-6 text-primary-dark" aria-hidden="true" />
            Carga Documental y Validación OCR (HU3)
          </h1>
          <p className="text-sm text-text-muted">
            Subí tu credencial o título universitario para validar automáticamente tus credenciales ante registros oficiales.
          </p>
        </div>

        {/* Switch para simular resultados del OCR en defensas o pruebas */}
        <div className="flex items-center gap-2 bg-white border border-borderSubtle px-3 py-1.5 rounded-xl text-xs self-start sm:self-auto shadow-sm">
          <span className="font-semibold text-text-muted">Modo de prueba OCR:</span>
          <select
            value={simulationMode}
            onChange={(e) => setSimulationMode(e.target.value)}
            className="bg-slate-50 border border-slate-300 text-xs font-bold rounded-lg px-2 py-1 text-primary-dark outline-none cursor-pointer"
          >
            <option value="match">Simular Coincidencia 100%</option>
            <option value="mismatch">Simular Inconsistencia (Revisión)</option>
          </select>
        </div>
      </div>

      {/* Datos declarados para contrastación */}
      <div className="card bg-slate-50 border-slate-200 p-4">
        <h2 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-primary-dark" aria-hidden="true" />
          Datos declarados a contrastar contra el documento (HU2)
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-text-muted block">Profesional:</span>
            <strong className="text-text-main font-semibold">{declaredData.name}</strong>
          </div>
          <div>
            <span className="text-text-muted block">Matrícula declarada:</span>
            <strong className="text-text-main font-mono font-semibold">{declaredData.registry}</strong>
          </div>
          <div>
            <span className="text-text-muted block">Profesión:</span>
            <strong className="text-text-main font-semibold">{declaredData.profession}</strong>
          </div>
          <div>
            <span className="text-text-muted block">Jurisdicción:</span>
            <strong className="text-text-main font-semibold">{declaredData.jurisdiction}</strong>
          </div>
        </div>
      </div>

      {/* Zona de Carga de Archivos */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 space-y-4">
          <div className="card space-y-4">
            <h2 className="font-bold text-base text-text-main">
              1. Seleccioná el tipo de comprobante
            </h2>

            <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Tipo de comprobante">
              <button
                type="button"
                onClick={() => setDocType('credencial')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  docType === 'credencial'
                    ? 'border-primary-dark bg-sky-50 ring-2 ring-primary-dark shadow-sm'
                    : 'border-borderSubtle bg-white hover:border-slate-400'
                }`}
              >
                <div className="text-xs font-bold text-text-main">Credencial del Colegio</div>
                <div className="text-[11px] text-text-muted mt-0.5">Matrícula provincial vigente</div>
              </button>

              <button
                type="button"
                onClick={() => setDocType('titulo')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  docType === 'titulo'
                    ? 'border-primary-dark bg-sky-50 ring-2 ring-primary-dark shadow-sm'
                    : 'border-borderSubtle bg-white hover:border-slate-400'
                }`}
              >
                <div className="text-xs font-bold text-text-main">Título / Diploma</div>
                <div className="text-[11px] text-text-muted mt-0.5">Título universitario oficial</div>
              </button>
            </div>

            {/* Drag and Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-primary-dark bg-sky-50 scale-[1.01]'
                  : 'border-slate-300 hover:border-primary-dark bg-slate-50/50 hover:bg-slate-50'
              }`}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') fileInputRef.current?.click(); }}
              aria-label="Zona de carga de archivos. Arrastrá tu documento o hacé click para seleccionarlo."
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleFileInputChange}
                className="hidden"
                id="file-upload-input"
              />

              <div className="w-14 h-14 mx-auto rounded-full bg-sky-100 text-primary-dark flex items-center justify-center mb-3 shadow-inner">
                <UploadCloud className="w-7 h-7" aria-hidden="true" />
              </div>
              
              <div className="font-bold text-sm text-text-main mb-1">
                Arrastrá tu archivo acá o <span className="text-primary-dark underline">examiná tus carpetas</span>
              </div>
              <p className="text-xs text-text-muted mb-3">
                Formatos soportados: <strong>PDF, JPG, PNG o WEBP</strong> (hasta 10 MB).
              </p>

              <div className="inline-flex items-center gap-1.5 text-[11px] text-slate-500 bg-white border border-slate-200 px-3 py-1 rounded-full">
                <Sparkles className="w-3.5 h-3.5 text-primary-dark" aria-hidden="true" />
                Extracción automática por OCR tras la subida
              </div>
            </div>
          </div>

          {/* Estado de procesamiento en curso */}
          {isProcessing && (
            <div className="card p-6 bg-white border-primary-light shadow-md animate-in fade-in" role="status" aria-live="polite">
              <div className="flex items-center gap-3 mb-3">
                <RefreshCw className="w-5 h-5 text-primary-dark animate-spin" aria-hidden="true" />
                <h3 className="font-bold text-sm text-text-main">Procesando documento con OCR...</h3>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 mb-2 overflow-hidden">
                <div className="bg-primary-dark h-2 rounded-full animate-pulse w-3/4"></div>
              </div>
              <p className="text-xs text-text-muted">{processingStep}</p>
            </div>
          )}
        </div>

        {/* Panel Lateral: Previsualizador y Resultados del OCR */}
        <div className="lg:col-span-5 space-y-4">
          {file ? (
            <div className="card border-2 border-primary-light space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between pb-3 border-b border-borderSubtle">
                <div className="flex items-center gap-2 truncate">
                  <File className="w-5 h-5 text-primary-dark flex-shrink-0" aria-hidden="true" />
                  <div className="truncate">
                    <div className="text-xs font-bold text-text-main truncate">{file.name}</div>
                    <div className="text-[11px] text-text-muted">{(file.size / (1024 * 1024)).toFixed(2)} MB</div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="p-1.5 text-text-muted hover:text-medical-error rounded-lg transition-colors"
                  aria-label="Eliminar archivo cargado"
                >
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>

              {/* Previsualización visual si es imagen */}
              {filePreview ? (
                <div className="relative rounded-xl overflow-hidden border border-borderSubtle bg-slate-100 max-h-56 flex items-center justify-center">
                  <img src={filePreview} alt="Previsualización del comprobante subido" className="object-contain w-full h-full max-h-56" />
                </div>
              ) : (
                <div className="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300">
                  <FileText className="w-12 h-12 text-slate-400 mx-auto mb-2" aria-hidden="true" />
                  <div className="text-xs font-semibold text-text-main">Documento PDF cargado</div>
                  <div className="text-[11px] text-text-muted">Listo para análisis de texto</div>
                </div>
              )}

              {/* Resultados de la Extracción OCR */}
              {ocrResult && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-text-muted">Extracción OCR</span>
                    <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                      Confianza: {ocrResult.confidenceScore}%
                    </span>
                  </div>

                  <div className="space-y-2 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <div className="flex justify-between items-center py-1 border-b border-slate-200">
                      <span className="text-text-muted">Nombre Detectado:</span>
                      <span className="font-semibold text-text-main flex items-center gap-1">
                        {ocrResult.extractedName}
                        {ocrResult.matches.name && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />}
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-1 border-b border-slate-200">
                      <span className="text-text-muted">Matrícula Detectada:</span>
                      <span className="font-mono font-bold flex items-center gap-1">
                        {ocrResult.extractedRegistry}
                        {ocrResult.matches.registry ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                        ) : (
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" aria-hidden="true" />
                        )}
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-1">
                      <span className="text-text-muted">Organismo Emisor:</span>
                      <span className="font-semibold text-text-main text-[11px] text-right truncate max-w-[200px]">
                        {ocrResult.extractedEntity}
                      </span>
                    </div>
                  </div>

                  {/* Feedback Condicional según Criterios de Aceptación */}
                  {ocrResult.status === 'success' ? (
                    <div className="space-y-3">
                      <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-950 text-xs flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-700 flex-shrink-0 mt-0.5" aria-hidden="true" />
                        <div>
                          <strong>¡Validación exitosa!</strong> Los datos extraídos coinciden con tu perfil y con el registro oficial.
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleConfirmValid}
                        className="btn-primary py-3 text-sm flex items-center justify-center gap-2"
                      >
                        <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                        Confirmar y Habilitar Matrícula Oficial
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-950 text-xs flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" aria-hidden="true" />
                        <div>
                          <strong>Discrepancia detectada:</strong> {ocrResult.discrepancyReason}
                        </div>
                      </div>

                      {auditSent ? (
                        <div className="p-3 bg-sky-50 border border-sky-300 rounded-xl text-sky-950 text-xs text-center font-semibold">
                          ✓ Expediente enviado a revisión manual por el equipo auditor.
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={handleSendToManualReview}
                          className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 px-4 rounded-lg text-xs transition-colors shadow-sm flex items-center justify-center gap-2"
                        >
                          <Clock className="w-4 h-4" aria-hidden="true" />
                          Derivar a Revisión Manual de Auditoría
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="card p-6 text-center text-text-muted border-dashed">
              <HelpCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" aria-hidden="true" />
              <div className="text-xs font-semibold text-text-main mb-1">Sin archivo seleccionado</div>
              <p className="text-[11px] leading-relaxed">
                Cuando subas tu credencial o título, acá podrás ver la previsualización y el reporte de extracción automatizado.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Historial de Documentos Presentados */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-borderSubtle">
          <h2 className="font-bold text-base text-text-main flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary-dark" aria-hidden="true" />
            Documentación Presentada y Estado de Auditoría
          </h2>
          <span className="text-xs text-text-muted">{documentHistory.length} documento(s) registrado(s)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs" role="table" aria-label="Historial de comprobantes">
            <thead>
              <tr className="border-b border-borderSubtle text-text-muted uppercase text-[11px]">
                <th scope="col" className="pb-2 font-semibold">Tipo y Archivo</th>
                <th scope="col" className="pb-2 font-semibold">Fecha</th>
                <th scope="col" className="pb-2 font-semibold">Confianza OCR</th>
                <th scope="col" className="pb-2 font-semibold">Estado</th>
                <th scope="col" className="pb-2 font-semibold">Observaciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borderSubtle">
              {documentHistory.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3">
                    <div className="font-bold text-text-main">{doc.type}</div>
                    <div className="text-slate-500 text-[11px]">{doc.filename} ({doc.size})</div>
                  </td>
                  <td className="py-3 text-text-muted font-mono">{doc.uploadDate}</td>
                  <td className="py-3 font-semibold text-primary-dark">{doc.ocrConfidence}</td>
                  <td className="py-3">
                    {doc.status === 'validado' ? (
                      <span className="inline-flex items-center gap-1 font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full text-[10px]">
                        <CheckCircle2 className="w-3 h-3" aria-hidden="true" /> Validado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full text-[10px]">
                        <Clock className="w-3 h-3" aria-hidden="true" /> En Revisión Manual
                      </span>
                    )}
                  </td>
                  <td className="py-3 text-text-muted text-[11px] max-w-xs">{doc.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
