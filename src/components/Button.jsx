export default function Button({ buttonText, onClick }) {
  return (
    <a class="f6 link dim ba pa2 mb2 dib black" href="#0" onClick={onClick}>
      {buttonText}
    </a>
  );
}
