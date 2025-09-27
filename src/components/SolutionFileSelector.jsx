import { useState, useCallback } from 'preact/hooks';

export default function SolutionFileSelector({ setSolution }) {
  const [message, setMessage] = useState('');
  const [error, setError] = useState(false);
  const [filename, setFilename] = useState('');

  const handleFileSelection = useCallback(
    async (event) => {
      const file = event.target.files?.[0];

      if (!file) {
        setMessage('No file selected!');
        setError(true);
        return;
      }

      if (!/\.json$/i.test(file.name)) {
        setMessage('Please select a JSON file');
        setError(true);
        setFilename(file.name);
        return;
      }

      try {
        const text = await file.text();
        const solution = JSON.parse(text); // validate JSON
        if (
          solution &&
          !('nodal_pressure' in solution) &&
          !('pipe_flow' in solution)
        ) {
          setMessage("Missing keys: 'nodal_pressure' or 'pipe_flow'.");
          setFilename(file.name);
          setError(true);
        } else {
          for (let key in solution.nodal_pressure) {
            if (typeof solution.nodal_pressure[key] === 'number') {
              // Convert Pa to psi
              solution.nodal_pressure[key] *= 0.000145038;
            }
          }
          for (let key in solution.pipe_flow) {
            if (typeof solution.pipe_flow[key] === 'number') {
              // convert kgps Mdthpd
              solution.pipe_flow[key] *= 4.0;
            }
          }
          setSolution(solution);
          setMessage('Success! File parsed.');
          setFilename(file.name);
          setError(false);
        }
      } catch (err) {
        console.error('Failed to parse file:', err);
        setMessage('Failed to parse JSON file.');
        setFilename(file.name);
        setError(true);
      }
    },
    [setSolution]
  );

  const alertClass = error ? 'dark-red' : 'green';

  return (
    <div class="pb2">
      <label
        htmlFor="solution-file-input"
        class="f6 link dim br3 ba bw1 pa2 mb2 dib near-black"
      >
        Select a solution file
      </label>

      <input
        type="file"
        id="solution-file-input"
        style="display:none;"
        accept="application/json,.json"
        onChange={handleFileSelection}
      />

      <div>
        <p>
          Status: {message && <span class={alertClass}>{message}</span>}
          &nbsp;&nbsp;
          {filename && (
            <span class="mv1 mid-gray pb2">File selected: {filename}</span>
          )}
        </p>
      </div>
    </div>
  );
}
