import {useRef, useState} from "react";
import {addDoc, collection, db, doc, getDownloadURL, ref, runTransaction, storage, uploadBytes} from "../../fb.js";
import yape from '../../assets/code_yape.jpeg';
import './SuportForm.css';

function SuportForm() {
  const [formData, setFormData] = useState({
    nombres: '',
    apellidos: '',
    celular: '',
    num_polladas: 1,
    tipoEntrega: '',
    metodoPago: '',
    direccion: ''
  });

  const [fileName, setFileName] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [newId, setNewId] = useState(null);
  const [errorMessage, setErrorMessage] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const handleChange = (e) => {
    const { name, value } = e.target;

    /* ─── 1. Polladas ───────────────────────── */
    if (name === "num_polladas") {
      let digits = value.replace(/\D/g, "").replace(/^0+/, "");
      setFormData(prev => ({ ...prev, num_polladas: digits }));
      return; // ← importantísimo
    }

    /* ─── 2. Celular ─────────────────────────── */
    if (name === "celular") {
      let digits = value.replace(/\D/g, "");     // solo dígitos
      if (digits.startsWith("51")) digits = digits.slice(2);
      if (digits.length > 9) digits = digits.slice(0, 9);
      if (digits && digits[0] !== "9") return;  // no toca el estado

      const formatted = digits ? `+51${digits}` : "";
      setFormData(prev => ({ ...prev, celular: formatted }));
      return; // ← corta aquí
    }

    /* ─── 3. Resto de campos ─────────────────── */
    setFormData(prev => ({ ...prev, [name]: value }));
  };


  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setFileName(file ? file.name : '');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.metodoPago === 'digital' && !fileInputRef.current.files[0]) {
      setErrorMessage('Para pago digital, debes subir la captura de pago.');
      return;
    }

    setLoading(true);
    setShowSuccessModal(false);
    setErrorMessage(false);

    try {
      // Auto-increment ID transaction
      const counterDocRef = doc(db, 'counters', 'polladas');
      let generatedId;
      await runTransaction(db, async (tx) => {
        const counterSnap = await tx.get(counterDocRef);
        const currentCount = counterSnap.exists() ? counterSnap.data().count : 0;
        const nextCount = currentCount + 1;
        tx.set(counterDocRef, { count: nextCount });
        generatedId = nextCount;
      });

      const submissionData = {
        id: generatedId,
        ...formData,
        timestamp: Date.now(),
      };

      // File upload only if digital
      if (formData.metodoPago === 'digital') {
        const file = fileInputRef.current.files[0];
        const storageReference = ref(storage, `comprobantes/${Date.now()}_${file.name}`);
        await uploadBytes(storageReference, file);
        submissionData.comprobanteURL = await getDownloadURL(storageReference);
        submissionData.pagado = true;
      } else {
        submissionData.pagado = false;
      }

      await addDoc(collection(db, 'polladas'), submissionData);

      setNewId(generatedId);
      setShowSuccessModal(true);
      setFormData({ nombres: '', apellidos: '', celular: '', num_polladas: 1, tipoEntrega: '', metodoPago: '', direccion: '' });
      // fileInputRef.current.value = null;
      setFileName('');
    } catch (error) {
      console.error('Error:', error);
      setErrorMessage(true);
    }

    setLoading(false);
  };

  return (
    <div className="container">
      <header className="header">
        <h1>🙏 Pollada Solidaria 🙏</h1>
        <p className="subtitle">Tu aporte es nuestra esperanza de vida</p>
      </header>

      <main className="content">
        <section className="message">
          <p>Hola, estoy enfrentando una situación de salud muy delicada y mi tratamiento ha generado gastos elevados para mi familia.</p>
          <p>Hoy necesito reunir <strong>S/ 5,000.00</strong> para la operación que debo realizarme, y tu colaboración marcará la diferencia.</p>

          <p>Te invito a apoyar nuestra <strong>pollada solidaria</strong> este <strong>sábado 31</strong>:</p>

          <div className="location">
            <p>📍 <strong>Av. Pesqueda Lt6 mz29</strong></p>
            <p>Al costado del Hostal Fantasy</p>
          </div>

          <div className="price">
            <span>💰 Precio por plato: S/ 15.00</span>
          </div>

          <p>Estoy tomando varios medicamentos y realizando análisis en centros privados. Con fe y optimismo sé que pronto volveré a estar bien.</p>

          <div className="hearts" aria-label="decorative">💖✨🙏✨💖</div>

          <p><strong>Para reservar tu plato, puedes yapearme o plinearme al +51989176371.</strong></p>
          <p><strong>Completa el formulario y sube el comprobante de pago (si aplica).</strong></p>

          <p className="thank-you" style={{ textAlign: 'center', fontWeight: 600, color: '#ff6b6b' }}>
            ¡Mil gracias por tu solidaridad!
          </p>
        </section>

        <section className="form-container">
          <div className="event-image-container">
            <img src={yape} alt="Código Yape para pagos" className="event-image" />
            <p><strong>+51 989 176 371</strong></p>
          </div>

          <h2 className="form-title">🤝 Formulario de Apoyo</h2>

          <form onSubmit={handleSubmit} id="supportForm">
            <div className="form-group">
              <label>Nombres *</label>
              <input type="text" name="nombres" value={formData.nombres} onChange={handleChange} required placeholder="Ingresa tus nombres" />
            </div>

            <div className="form-group">
              <label>Apellidos *</label>
              <input type="text" name="apellidos" value={formData.apellidos} onChange={handleChange} required placeholder="Ingresa tus apellidos" />
            </div>

            <div className="form-group">
              <label>Número de Celular *</label>
              <input
                type="tel"
                name="celular"
                value={formData.celular}      // p. ej. "+51933000439"
                onChange={handleChange}
                placeholder="+51987654321"
                maxLength={12}                // "+51" (3) + 9 dígitos
                title="Debe iniciar con 9 y tener 9 dígitos (ej: 987654321)"
                inputMode="tel"
              />
            </div>

            <div className="form-group">
              <label>Número de polladas *</label>
              <input
                type="number"
                name="num_polladas"
                value={formData.num_polladas}
                onChange={handleChange}
                placeholder="Ej: 5"
                min={1}
                step={1}
                inputMode="numeric"
              />
            </div>

            <div className="form-group">
              <label>¿Cómo prefieres recibir tu pedido? *</label>
              <div className="delivery-options">
                <label className="delivery-option">
                  <input
                    type="radio"
                    name="tipoEntrega"
                    value="recojo"
                    checked={formData.tipoEntrega === 'recojo'}
                    onChange={handleChange}
                    required
                  />
                  <div className="option-content">
                    <span>🛵 Recojo en el local</span>
                    <p className="option-description">Av. Pesqueda Lt6 mz29, al costado del hostal fantasy</p>
                  </div>
                </label>

                <label className="delivery-option">
                  <input
                    type="radio"
                    name="tipoEntrega"
                    value="delivery"
                    checked={formData.tipoEntrega === 'delivery'}
                    onChange={handleChange}
                    required
                  />
                  <div className="option-content">
                    <span>🏠 Delivery (envío a domicilio)</span>
                  </div>
                </label>
              </div>
            </div>

            {formData.tipoEntrega === 'delivery' && (
              <div className="form-group">
                <label>Dirección *</label>
                <input
                  type="text"
                  name="direccion"
                  value={formData.direccion}
                  onChange={handleChange}
                  required
                  placeholder="Ingresa tu dirección de delivery"
                />
              </div>
            )}

            <div className="form-group">
              <label>Método de Pago *</label>
              <div className="payment-options">
                <label className="payment-option">
                  <input
                    type="radio"
                    name="metodoPago"
                    value="contraentrega"
                    checked={formData.metodoPago === 'contraentrega'}
                    onChange={handleChange}
                    required
                  />
                  <div className="option-content">
                    <span>💵 Contra entrega</span>
                    <p className="option-description">Paga al momento de recibir la pollada en mi domicilio</p>
                  </div>
                </label>

                <label className="payment-option">
                  <input
                    type="radio"
                    name="metodoPago"
                    value="digital"
                    checked={formData.metodoPago === 'digital'}
                    onChange={handleChange}
                    required
                  />
                  <div className="option-content">
                    <span>📱 Digital (Yape/Plin)</span>
                    <p className="option-description">Adjunta comprobante de pago</p>
                  </div>
                </label>
              </div>
            </div>

            {formData.metodoPago === 'digital' && (
              <div className="form-group">
                <label>Comprobante de Pago (Imagen) *</label>
                <div className="file-upload">
                  <input type="file" id="comprobante" ref={fileInputRef} onChange={handleFileChange} accept="image/*" />
                  <label htmlFor="comprobante">📷 Seleccionar imagen del comprobante</label>
                </div>
                {fileName && <div className="file-name">📄 Archivo: {fileName}</div>}
              </div>
            )}

            {errorMessage && typeof errorMessage === 'string' && <div className="error-message">{errorMessage}</div>}

            <button type="submit" className="submit-btn" disabled={loading || (formData.metodoPago === 'digital' && !fileName)}>
              {loading ? '⏳ Procesando...' : '💝 Confirmar mi Apoyo 💝'}
            </button>
          </form>
        </section>
      </main>

      {showSuccessModal && (
        <div className="inline-modal">
          <div className="modal-content">
            <h2>💝 ¡Gracias por tu apoyo! 💝</h2>
            <p>Tu número de confirmación es: <strong>{newId}</strong></p>
            <p>📩 El sábado recibirás un mensaje para coordinar la entrega de tu pollada.</p>
            <button className="modal-close-btn" onClick={()=>setShowSuccessModal(false)}>Cerrar</button>
          </div>
        </div>
      )}

      <footer className="footer">
        “La generosidad es el mejor regalo que podemos dar y recibir.”
      </footer>
    </div>
  );
}

export default SuportForm