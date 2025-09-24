import { useState, useCallback } from 'preact/hooks';

export default function FolderSelector() {
  const [state, setState] = useState({
    message: '',
    errorStatus: false
  });

  const requiredFiles = ['geo.json', 'network.json', 'nominations.json'];

  const handleFolderSelection = useCallback((event) => {
    const files = event.target.files;

    if (!files || files.length === 0) {
      setState({
        message: 'Folder is empty!',
        errorStatus: true
      });
      return;
    }

    const topLevelFileNames = Array.from(files)
      .filter((file) => file.webkitRelativePath.split('/').length === 2)
      .map((file) => file.name);

    const missingFiles = requiredFiles.filter(
      (requiredFile) => !topLevelFileNames.includes(requiredFile)
    );

    if (missingFiles.length === 0) {
      setState({
        message: 'Success! All required files were found.',
        errorStatus: false
      });
    } else {
      setState({
        message: `Missing files: ${missingFiles.join(', ')}!`,
        errorStatus: true
      });
    }
  }, []);

  const alertClass = state.errorStatus ? 'dark-red' : 'green';

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
        onChange={handleFolderSelection}
      />

      {state.message && (
        <div class={alertClass}>
          <p>{state.message}</p>
        </div>
      )}
    </div>
  );
}
