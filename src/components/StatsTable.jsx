export default function StatsTable({ stats }) {
  if (!stats) return null;

  return (
    <div class="measure-wide lh-copy overflow-auto">
      <table class="collapse ba b--black-20 w-100">
        <thead>
          <tr>
            <th class="fw6 tl pa2 bg-white ba b--black-20">Field</th>
            <th class="fw6 tl pa2 bg-white ba b--black-20">Value</th>
          </tr>
        </thead>
        <tbody class="lh-copy">
          <tr>
            <td class="pa2 ba b--black-20">Length</td>
            <td class="pa2 ba b--black-20">
              {stats['pipelineLengthInKms']} km
            </td>
          </tr>
          <tr>
            <td class="pa2 ba b--black-20"># nodes</td>
            <td class="pa2 ba b--black-20">{stats['counts']['node']}</td>
          </tr>
          <tr>
            <td class="pa2 ba b--black-20"># pipe segments</td>
            <td class="pa2 ba b--black-20">{stats['counts']['pipe']}</td>
          </tr>
          <tr>
            <td class="pa2 ba b--black-20"># compressors</td>
            <td class="pa2 ba b--black-20">{stats['counts']['compressor']}</td>
          </tr>
          <tr>
            <td class="pa2 ba b--black-20"># receipts</td>
            <td class="pa2 ba b--black-20">{stats['counts']['receipt']}</td>
          </tr>
          <tr>
            <td class="pa2 ba b--black-20"># deliveries</td>
            <td class="pa2 ba b--black-20">{stats['counts']['delivery']}</td>
          </tr>
          <tr>
            <td class="pa2 ba b--black-20"># interconnects</td>
            <td class="pa2 ba b--black-20">
              {stats['counts']['interconnect']}
            </td>
          </tr>
          <tr>
            <td class="pa2 ba b--black-20"># storages</td>
            <td class="pa2 ba b--black-20">{stats['counts']['storage']}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
