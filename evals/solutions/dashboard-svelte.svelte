<script>
  const wau = {
    labels: ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8'],
    series: [{ name: 'Weekly active users', values: [2810, 2950, 3020, 3100, 3180, 3240, 3330, 3412] }],
  };
  const plans = { segments: [{ name: 'Free', value: 62 }, { name: 'Pro', value: 31 }, { name: 'Enterprise', value: 7 }] };
  // data is a property, not an attribute: set it on the element.
  const setData = (data) => (el) => {
    el.data = data;
  };
</script>

<main style="padding: var(--void-space-4); display: grid; gap: var(--void-space-6); grid-template-columns: minmax(0, 1fr);">
  <h1>Usage</h1>
  <section style="display: grid; grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr)); gap: var(--void-space-4);">
    <void-card><void-stat label="Weekly active users" value="3,412"></void-stat></void-card>
    <void-card><void-stat label="Avg. session" value="6m 20s"></void-stat></void-card>
    <void-card><void-stat label="Error rate" value="0.4%"></void-stat></void-card>
  </section>
  <section style="display: grid; grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr)); gap: var(--void-space-4);">
    <void-card heading="Weekly active users">
      <void-line-chart aria-label="Weekly active users" {@attach setData(wau)}></void-line-chart>
    </void-card>
    <void-card heading="Plan mix">
      <void-donut-chart aria-label="Plan mix" show-total {@attach setData(plans)}></void-donut-chart>
    </void-card>
  </section>
</main>
