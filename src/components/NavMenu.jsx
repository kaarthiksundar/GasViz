class Link {
    constructor(name, route) {
        this.name = name;
        this.route = route;
    }
};

export default function NavMenu() {
    var links = [
        new Link('Steady State Solution', '/#!'),
        new Link('Steady State Model Comparison', '/#!/1'),
        new Link('Relevant Publications', '/#!/2'),
        new Link('README', '/#!/3')
    ];
    
    return (
        <nav class="pa3 ph5-ns w-100 bg-transparent pv3 mb3 mb5-ns bt bb b--black-10 overflow-auto">
            <div class="nowrap mw9 center">
                {links.map((item) => (
                    <a class="pv1-ns f5 fw5 dim link black mr3 mr3-m mr4-l dib" 
                    title={item.name} href={item.route}>{item.name}</a>
                ))}
            </div>
        </nav>
    );
};

