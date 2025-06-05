import React, { useEffect, useState } from 'react';
import { storage, ref as storageRef, getDownloadURL, db, collection, getDocs, doc, updateDoc, deleteDoc } from '../../fb.js';
import './Kathia.css';
import './PolladasDashboard.css';

export default function Kathia() {
  const [polladas, setPolladas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({ total: 0, totalPolladas: 0 });
  const [updatingIds, setUpdatingIds] = useState([]);
  const [selectedBy, setSelectedBy] = useState({});

  useEffect(() => {
    async function fetchPolladas() {
      try {
        const snapshot = await getDocs(collection(db, 'polladas'));
        const items = await Promise.all(snapshot.docs.map(async docSnap => {
          const data = docSnap.data();
          let url = null;
          if (data.comprobanteURL) {
            url = data.comprobanteURL;
          } else if (data.comprobantePath) {
            url = await getDownloadURL(storageRef(storage, data.comprobantePath));
          }
          return {
            // ID DE FIRESTORE
            id: docSnap.id,
            nombres: data.nombres,
            apellidos: data.apellidos,
            celular: data.celular,
            num_polladas: data.num_polladas,
            tipoEntrega: data.tipoEntrega,
            metodoPago: data.metodoPago,
            comprobanteURL: url,
            timestamp: data.timestamp,
            direccion: data.direccion || 'No especificada',
            pagado: data.pagado || false,       // Asegúrate de leer el campo pagado
            entregado: data.entregado || false,  // idem para entregado
            by: data.by || null
          };
        }));

        items.sort((a, b) => {
          const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
          const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;

          return timeB - timeA;
        });

        setPolladas(items);

        // Calcular estadísticas
        const totalPolladas = items.reduce((sum, item) => sum + (parseInt(item.num_polladas) || 0), 0);
        setStats({ total: items.length, totalPolladas });

      } catch (err) {
        console.error(err);
        setError('Error al cargar los registros.');
      } finally {
        setLoading(false);
      }
    }

    fetchPolladas().then(() => {
      console.log('Datos cargados correctamente');
    });
  }, []);

  const handleMarkAsPaid = async (itemId) => {
    try {
      setUpdatingIds(prev => [...prev, itemId]);

      // Actualiza en Firestore el campo 'pagado' a true
      const docRef = doc(db, 'polladas', itemId);
      await updateDoc(docRef, { pagado: true });

      // Actualizar estado local
      setPolladas(prev => prev.map(item =>
        item.id === itemId ? { ...item, pagado: true } : item
      ));
    } catch (error) {
      console.error('Error al marcar como pagado:', error);
    }  finally {
      // Quitamos este ID de “updatingIds” (sea éxito o error)
      setUpdatingIds(prev => prev.filter(id => id !== itemId));
    }
  };

  const handleMarkAsDelivered = async (itemId) => {
    try {
      // Añadimos al array de IDs en carga
      setUpdatingIds(prev => [...prev, itemId]);

      const docRef = doc(db, 'polladas', itemId);
      await updateDoc(docRef, { entregado: true });

      // Actualizar estado local
      setPolladas(prev => prev.map(item =>
        item.id === itemId ? { ...item, entregado: true } : item
      ));
    } catch (error) {
      console.error('Error al marcar como entregado:', error);
    } finally {
      setUpdatingIds(prev => prev.filter(id => id !== itemId));
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Sin fecha';
    return new Date(timestamp).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getInitials = (nombres, apellidos) => {
    const n = nombres ? nombres.charAt(0) : '';
    const a = apellidos ? apellidos.charAt(0) : '';
    return (n + a).toUpperCase();
  };

  const getPaymentIcon = (metodo) => {
    const icons = {
      'Yape': '💳',
      'Plin': '📱',
      'Transferencia': '🏦',
      'Efectivo': '💰',
      'Tarjeta': '💳'
    };
    return icons[metodo] || '💳';
  };

  const getDeliveryIcon = (tipo) => {
    return tipo === 'Delivery' ? '🚚' : '🏪';
  };

  const handleAssignBy = async (itemId, assignee) => {
    try {
      setUpdatingIds(prev => [...prev, itemId]);
      const docRef = doc(db, 'polladas', itemId);

      // Actualizar Firestore
      await updateDoc(docRef, { by: assignee });

      // Actualizar estado local inmediatamente (optimistic update)
      setPolladas(prev =>
        prev.map(item =>
          item.id === itemId ? { ...item, by: assignee } : item
        )
      );

      // Actualizar el estado de selección
      setSelectedBy(prev => ({ ...prev, [itemId]: assignee }));
    } catch (error) {
      console.error(`Error al asignar "${assignee}" al pedido ${itemId}:`, error);
    } finally {
      setUpdatingIds(prev => prev.filter(id => id !== itemId));
    }
  };

  const handleDeletePollada = async (itemId) => {
    try {
      // Mostrar confirmación
      const confirm = window.confirm('¿Estás seguro de querer eliminar este registro?');
      if (!confirm) return;

      setUpdatingIds(prev => [...prev, itemId]);

      // Eliminar del Firestore
      const docRef = doc(db, 'polladas', itemId);
      await deleteDoc(docRef);

      // Actualizar estado local
      setPolladas(prev => prev.filter(item => item.id !== itemId));
    } catch (error) {
      console.error('Error al eliminar:', error);
    } finally {
      setUpdatingIds(prev => prev.filter(id => id !== itemId));
    }
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-state" style={{ padding: '2rem', textAlign: 'center' }}>
          <div className="spinner" style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
          <p>Cargando registros...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-container">
        <div className="error-state" style={{ padding: '2rem', textAlign: 'center', color: '#ef4444' }}>
          <div className="error-icon" style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚠️</div>
          <h3>Error al cargar</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="header">
        <div className="header-content">
          <h1 className="main-title">
            Dashboard de <span className="gradient-text">Polladas</span>
          </h1>
          <p className="subtitle">Gestión completa de pedidos y registros</p>

          <div className="stats-container">
            <div className="stat-card">
              <div className="stat-icon">📦</div>
              <div className="stat-info">
                <div className="stat-number">{stats.total}</div>
                <div className="stat-label">Pedidos</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🍗</div>
              <div className="stat-info">
                <div className="stat-number">{stats.totalPolladas}</div>
                <div className="stat-label">Polladas</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">📅</div>
              <div className="stat-info">
                <div className="stat-number">Live</div>
                <div className="stat-label">Tiempo Real</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {polladas.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <h3>No hay registros</h3>
            <p>Los pedidos aparecerán aquí cuando se registren.</p>
          </div>
        ) : (
          <div className="cards-grid">
            {polladas.map((item, index) => (
              <div key={item.id} className="card" style={{animationDelay: `${index * 100}ms`}}>
                {/* Marca de agua según estado */}
                {item.pagado && item.entregado && (
                  <div className="watermark watermark--completado">
                    COMPLETADO
                  </div>
                )}

                {item.pagado && !item.entregado && (
                  <div className="watermark watermark--pagado">
                    PAGADO
                  </div>
                )}

                {/* Card Header */}
                <div className="card-header">
                  <div className="user-section">
                    <div className="user-avatar">
                      {getInitials(item.nombres, item.apellidos)}
                    </div>
                    <div className="user-info">
                      <h3 className="user-name">
                        {item.nombres} {item.apellidos}
                      </h3>
                      <div className="user-id">ID: #{item.id}</div>
                    </div>
                  </div>

                  <div className="timestamp">
                    <span className="clock-icon">🕒</span>
                    <span className="time-text">{formatDate(item.timestamp)}</span>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="details-grid">
                  <div className="detail-item phone">
                    <div className="detail-icon">📞</div>
                    <div className="detail-content">
                      <div className="detail-label">Celular</div>
                      <div className="detail-value">{item.celular}</div>
                    </div>
                  </div>

                  <div className="detail-item quantity">
                    <div className="detail-icon">📦</div>
                    <div className="detail-content">
                      <div className="detail-label">Polladas</div>
                      <div className="detail-value quantity-number">{item.num_polladas}</div>
                    </div>
                  </div>

                  <div className="detail-item delivery">
                    <div className="detail-icon">{getDeliveryIcon(item.tipoEntrega)}</div>
                    <div className="detail-content">
                      <div className="detail-label">Entrega</div>
                      <div className="detail-value">{item.tipoEntrega}</div>
                    </div>
                  </div>

                  <div className="detail-item payment">
                    <div className="detail-icon">{getPaymentIcon(item.metodoPago)}</div>
                    <div className="detail-content">
                      <div className="detail-label">Pago</div>
                      <div className="detail-value">{item.metodoPago}</div>
                    </div>
                  </div>
                </div>

                {item.tipoEntrega === 'delivery' && (
                  <div className="detail-item address">
                    <div className="detail-icon">📍</div>
                    <div className="detail-content">
                      <div className="detail-label">Dirección</div>
                      <div className="detail-value">{item.direccion}</div>
                    </div>
                  </div>
                )}

                {/* Comprobante */}
                {item.comprobanteURL ? (
                  <div className="comprobante-section">
                    <a
                      href={item.comprobanteURL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="comprobante-link"
                    >
                      <img
                        src={item.comprobanteURL}
                        alt={`Comprobante ${item.id}`}
                        className="comprobante-image"
                      />
                      <div className="comprobante-overlay">
                        <span className="external-icon">🔗</span>
                        <span className="overlay-text">Ver comprobante</span>
                      </div>
                    </a>
                  </div>
                ) : null}

                {/* Botones según estado */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {/* Determinamos si este ítem está “en loading” */}
                  {(() => {
                    const isUpdating = updatingIds.includes(item.id);

                    return (
                      <>
                        {/* Solo mostramos “Marcar Pagado” si no está pagado aún */}
                        {!item.pagado && (
                          <button
                            onClick={() => handleMarkAsPaid((item.id))}
                            disabled={isUpdating}
                            style={{
                              flex: item.comprobanteURL ? '1' : '1 0 100%',
                              padding: '0.75rem',
                              background: isUpdating
                                ? 'rgba(34, 197, 94, 0.5)'  // Color grisáceo mientras carga
                                : 'linear-gradient(135deg, #22c55e, #16a34a)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              fontWeight: '600',
                              cursor: isUpdating ? 'not-allowed' : 'pointer',
                              fontSize: '0.9rem',
                              transition: 'transform 0.2s',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.5rem'
                            }}
                            onMouseEnter={(e) => {
                              if (!isUpdating) e.target.style.transform = 'translateY(-2px)';
                            }}
                            onMouseLeave={(e) => {
                              if (!isUpdating) e.target.style.transform = 'translateY(0)';
                            }}
                          >
                            {isUpdating ? (
                              // Muestra texto “Cargando...” en lugar de “Marcar Pagado”
                              <span>Cargando…</span>
                            ) : (
                              <>
                                <span>💰</span>
                                <span>Marcar Pagado</span>
                              </>
                            )}
                          </button>
                        )}

                        {/* Si ya está pagado pero no entregado, mostramos “Marcar Entregado” */}
                        {item.pagado && !item.entregado && (
                          <button
                            onClick={() => handleMarkAsDelivered((item.id))}
                            disabled={isUpdating}
                            style={{
                              flex: '1',
                              padding: '0.75rem',
                              background: isUpdating
                                ? 'rgba(59, 130, 246, 0.5)'  // Color grisáceo mientras carga
                                : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              fontWeight: '600',
                              cursor: isUpdating ? 'not-allowed' : 'pointer',
                              fontSize: '0.9rem',
                              transition: 'transform 0.2s',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.5rem'
                            }}
                            onMouseEnter={(e) => {
                              if (!isUpdating) e.target.style.transform = 'translateY(-2px)';
                            }}
                            onMouseLeave={(e) => {
                              if (!isUpdating) e.target.style.transform = 'translateY(0)';
                            }}
                          >
                            {isUpdating ? (
                              // Muestra texto “Cargando...” en lugar de “Marcar Entregado”
                              <span>Cargando…</span>
                            ) : (
                              <>
                                <span>📦</span>
                                <span>Marcar Entregado</span>
                              </>
                            )}
                          </button>
                        )}

                        {/* Si ya está pagado y entregado, mostramos un texto fijo */}
                        {item.pagado && item.entregado && (
                          <div
                            style={{
                              flex: '1',
                              padding: '0.75rem',
                              background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                              color: 'white',
                              borderRadius: '8px',
                              fontWeight: '600',
                              fontSize: '0.9rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.5rem'
                            }}
                          >
                            <span>✅</span>
                            <span>Pedido Completado</span>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
                <br />
                <div className="assignee-buttons-container">
                  {['Kathia', 'Flor', 'Giancarlo', 'Alejandro'].map(name => (
                    <button
                      key={name}
                      onClick={() => handleAssignBy(item.id, name)}
                      disabled={updatingIds.includes(item.id)}
                      className={`assignee-button ${item.by === name ? 'active' : ''}`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
                <br />
                <button
                  onClick={() => handleDeletePollada(item.id)}
                  disabled={updatingIds.includes(item.id)}
                  style={{
                    flex: '1',
                    padding: '0.75rem',
                    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    transition: 'transform 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}
                  onMouseEnter={(e) => {
                    if (!updatingIds.includes(item.id)) e.target.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    if (!updatingIds.includes(item.id)) e.target.style.transform = 'translateY(0)';
                  }}
                >
                  <span>❌</span>
                  <span>Eliminar</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}