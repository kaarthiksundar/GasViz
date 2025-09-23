import { Component } from 'preact';

export class FolderSelector extends Component {
    constructor() {
        super(); 
        this.state = {
            message: '',
            errorStatus: false
        };
        this.requiredFiles = ['geo.json', 'network.json', 'nominations.json']
    }

    handleFolderSelection = (event) => {
        const files = event.target.files; 

        if (files.length === 0) {
            this.setState({
                message: 'Folder is empty', 
                errorStatus: true
            });
            return;
        }

        const baseDir = files[0].webkitRelativePath.split('/')[0];
        // Filter files to only include those in the top level of the selected directory
        const topLevelFileNames = Array.from(files)
            .filter(file => file.webkitRelativePath.split('/').length === 2)
            .map(file => file.name);
    
        // Check if all required files are present
        const missingFiles = this.requiredFiles.filter(
            (requiredFile) => !topLevelFileNames.includes(requiredFile)
        );

        if (missingFiles.length === 0) {
            this.setState({
                message: 'Success! All required files were found.',
                errorStatus: false,
            });
        // You can also perform additional logic here, such as reading the files
        // and uploading them to a server if needed.
        } else {
            this.setState({
                message: `Missing files: ${missingFiles.join(', ')}`,
                errorStatus: true,
            });
        }
    };

    render() {
        const { message, errorStatus } = this.state;
        const alertClass = errorStatus ? "dark-red" : "green";

        return (
            <div>
                <label htmlFor="folder-input" class="f6 link dim br3 ba bw1 pa2 mb2 dib near-black">
                    Select the case folder
                </label>
                <input
                type="file"
                id="folder-input"
                style="display:none;"
                webkitdirectory="true"
                directory="true"
                onChange={this.handleFolderSelection}
                />
                {message && (
                    <div class={alertClass}>
                        <p>{message}</p>
                    </div>
                )}
            </div>
        );
    }
}

export default FolderSelector;

// import { useRef, useState } from 'preact/hooks';

// export function FolderSelectButton({ onFolderSelected }) {
//   const fileInputRef = useRef(null);
//   const [selectedDirectory, setSelectedDirectory] = useState('');

//   const handleFileChange = (event) => {
//     const files = event.target.files;
//     if (files.length > 0) {
//       // Get the name of the root directory
//       const folderName = files[0].webkitRelativePath.split('/')[0];
//       setSelectedDirectory(folderName);
//       onFolderSelected(files);
//     }
//   };

//   const handleButtonClick = () => {
//     fileInputRef.current.click();
//   };

//   return (
//     <div>
//       <input
//         type="file"
//         webkitdirectory
//         multiple
//         ref={fileInputRef}
//         onChange={handleFileChange}
//         style={{ display: 'none' }} // Hide the standard file input
//       />
//       <button onClick={handleButtonClick}>
//         Select Folder
//       </button>
//       {selectedDirectory && (
//         <p>Selected folder: <strong>{selectedDirectory}</strong></p>
//       )}
//     </div>
//   );
// }

