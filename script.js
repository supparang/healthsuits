AFRAME.registerSystem('gameflow', {
  init(){
    this.state = 'menu';
  },
  setState(s){
    this.state = s;
    document.querySelector('#hudState').setAttribute('text', 'value', 'โหมด: ' + s);
    ['menu','hygiene','nutrition','exercise'].forEach(id=>{
      const grp = document.querySelector('#grp_' + id);
      if (grp) grp.setAttribute('visible', id===s);
    });
  }
});

function goMode(mode){
  document.querySelector('a-scene').systems.gameflow.setState(mode);
}

AFRAME.registerComponent('tick-timer', { tick(){} });
AFRAME.registerComponent('hand-gestures', { tick(){} });
