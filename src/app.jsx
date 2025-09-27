import { Fragment } from 'preact';
import Header from './components/Header.jsx';
import NavMenu from './components/NavMenu.jsx';
import SolutionVizualizer from './components/SolutionViz.jsx';

export function App() {
  return (
    <Fragment>
      <Header />
      <NavMenu />
      <article class="ph3 ph5-ns">
        <div class="mw8 center">
          <h1 class="mt0 f6 f5-ns ttu tracked">Instructions</h1>
          <p class="f5 measure lh-copy">
            First, select the pipeline case folder. It should contain the files
            geo.json, network.json and nominations.json. If the files are not
            available in the folder, you will see a missing files error message,
            otherwise you should see a success message. Other button names are
            self-explanatory. Unit of mass flow rate are in Mdthpd (1000
            decatherms per day) and unit of pressure is psi (pounds per square
            inch). 1 Mdthpd equals 0.25 kgps.
          </p>
        </div>
        <SolutionVizualizer />
      </article>
    </Fragment>
  );
}
