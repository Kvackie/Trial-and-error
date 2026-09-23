// Short message that floats in and fades out, for things the player should notice
// but not have to dismiss.
//   showToast(scene, text, { y, color, duration })
export function showToast(scene, text, { y = scene.scale.height * 0.3, color = '#ffffff', duration = 2200, fontSize = 34 } = {}) {
  const label = scene.add
    .text(360, y, text, {
      fontFamily: 'sans-serif',
      fontSize: `${fontSize}px`,
      fontStyle: 'bold',
      color,
      align: 'center',
      stroke: '#000000',
      strokeThickness: 6,
      wordWrap: { width: 640 },
    })
    .setOrigin(0.5)
    .setDepth(100)
    .setAlpha(0);
  scene.tweens.add({ targets: label, alpha: 1, y: y - 20, duration: 250 });
  scene.tweens.add({ targets: label, alpha: 0, y: y - 50, delay: duration, duration: 400, onComplete: () => label.destroy() });
  return label;
}
