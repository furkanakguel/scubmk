'use client';
import { memo } from 'react';
import { appLabels, type AppId, type DesktopState } from '../lab/desktop';
import { DesktopIcon } from './DesktopIcons';
function DesktopTasks({
  desktop,
  onOpen,
  onClose,
  onMinimize,
}: {
  desktop: DesktopState;
  onOpen: (app: AppId) => void;
  onClose: (app: AppId) => void;
  onMinimize: (app: AppId) => void;
}) {
  const asleep = desktop.minimized.length;
  return (
    <div className="os-tasks">
      <div className="os-task-heading">
        <DesktopIcon app="tasks" />
        <div>
          <span>BMK OS / OTURUM</span>
          <h3>Görev yöneticisi</h3>
          <p>Açık pencerelerini tek yerden yönet.</p>
        </div>
      </div>
      <div className="os-task-summary">
        <div>
          <strong>{desktop.open.length}</strong>
          <span>Açık pencere</span>
        </div>
        <div>
          <strong>{desktop.focus ? 1 : 0}</strong>
          <span>Önde çalışan</span>
        </div>
        <div>
          <strong>{asleep}</strong>
          <span>Küçültülmüş</span>
        </div>
      </div>
      <div className="os-task-table">
        <div className="os-task-table-head">
          <span>Uygulama</span>
          <span>Durum</span>
          <span>İşlemler</span>
        </div>
        {desktop.open.map((app) => (
          <div className="os-task-row" key={app}>
            <span>
              <DesktopIcon app={app} />
              <strong>{appLabels[app]}</strong>
            </span>
            <span
              className={
                'os-process-status ' +
                (desktop.minimized.includes(app)
                  ? 'sleeping'
                  : desktop.focus === app
                    ? 'foreground'
                    : 'background')
              }
            >
              <i />
              {desktop.minimized.includes(app)
                ? 'Küçültüldü'
                : desktop.focus === app
                  ? 'Etkin'
                  : 'Arka planda'}
            </span>
            <div>
              <button
                className="os-button"
                onClick={() => onOpen(app)}
                aria-label={appLabels[app] + ' öne getir'}
              >
                Aç
              </button>
              <button
                className="os-button"
                onClick={() => onMinimize(app)}
                disabled={desktop.minimized.includes(app)}
                aria-label={appLabels[app] + ' küçült'}
              >
                _
              </button>
              <button
                className="os-button"
                onClick={() => onClose(app)}
                aria-label={appLabels[app] + ' kapat'}
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="os-task-explainer">
        <span>◷</span>
        <p>
          BMK Run, başka pencereye geçtiğinde duraklar. Görünmeyen atölye animasyonları bekler.
          <small>
            Burada yalnızca BMK OS pencereleri listelenir; cihazının diğer uygulamalarına erişilmez.
          </small>
        </p>
      </div>
    </div>
  );
}
export default memo(DesktopTasks);
