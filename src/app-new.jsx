import { Fragment } from 'preact';
import Header from './components/Header.jsx'
import NavMenu from './components/NavMenu.jsx'
import FolderSelector from './components/FolderSelectButton.jsx';


export function App() {
    return (
        <Fragment>
            <Header />
            <NavMenu />
            <article class="ph3 ph5-ns">
                <div class="mw9 center">
                    <h1 class="mt0 f5 f4-ns">
                        Basic instructions
                    </h1>
                    <p class="f5 measure lh-copy">
                        First, select the pipeline case folder. It should contain the files geo.json, network.json and nominations.json. 
                        If the files are not available in the folder, you will see a missing files error message, otherwise you should 
                        see a success message. 
                        Other button names are self-explanatory.
                    </p>
                    <FolderSelector />
                </div>
            </article> 
        </Fragment>
    )
}

