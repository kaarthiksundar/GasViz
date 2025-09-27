import { useState, useCallback } from 'preact/hooks';

export default function CaseSelector({ setData }) {
  const [message, setMessage] = useState('');
  const [error, setError] = useState(false);

  const requiredFiles = ['geo.json', 'network.json', 'nominations.json'];

  const handleCaseSelection = useCallback(
    async (event) => {
      const files = event.target.files;

      if (!files || files.length === 0) {
        setMessage('Folder is empty!');
        setError(true);
        return;
      }

      const fileArray = Array.from(files);

      const topLevelFiles = fileArray.reduce((acc, file) => {
        const relativePath = file.webkitRelativePath || file.name;
        if (relativePath.split('/').length === 2) {
          acc[file.name] = file;
        }
        return acc;
      }, {});

      const missingFiles = requiredFiles.filter(
        (requiredFile) => !topLevelFiles[requiredFile]
      );

      if (missingFiles.length === 0) {
        try {
          const [geoText, networkText, nominationsText] = await Promise.all([
            topLevelFiles['geo.json'].text(),
            topLevelFiles['network.json'].text(),
            topLevelFiles['nominations.json'].text(),
          ]);
          const parsedGeo = JSON.parse(geoText);
          const parsedNetwork = JSON.parse(networkText);
          const parsedNominations = JSON.parse(nominationsText);
          if (typeof setData === 'function') {
            setData({
              geo: parsedGeo,
              network: parsedNetwork,
              nominations: parsedNominations,
            });
          }
          setMessage('Success!');
          setError(false);
        } catch (err) {
          console.error('Failed to read required files:', err);
          setMessage('Failed to read or parse required files.');
          setError(true);
        }
      } else {
        setMessage(`Missing ${missingFiles.join(', ')}!`);
        setError(true);
      }
    },
    [setData]
  );

  const alertClass = error ? 'dark-red' : 'green';

  return (
    <div>
      <label
        htmlFor="folder-input"
        class="f6 link dim br3 ba bw1 pa2 mb2 dib near-black"
      >
        Select the case folder
      </label>

      <input
        type="file"
        id="folder-input"
        style="display:none;"
        webkitdirectory="true"
        directory="true"
        onChange={handleCaseSelection}
      />

      <div>
        <p>
          Case loading status:{' '}
          {message && <span class={alertClass}>{message}</span>}
        </p>
      </div>
    </div>
  );
}
