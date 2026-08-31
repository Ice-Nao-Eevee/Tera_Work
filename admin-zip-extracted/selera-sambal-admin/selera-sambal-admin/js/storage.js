/* Shared local data layer. Frontend-only: use a server for production security. */
const StorageManager= {
  prefix:'ss_admin_',
  keys:['restaurant',
  'products',
  'categories',
  'orders',
  'customers',
  'promotions',
  'reviews',
  'notifications',
  'settings',
  'admin'],
  defaults: {
    restaurant: {
      name:'Selera Sambal',
      description:'',
      phone:'',
      email:'',
      address:'',
      hours:'',
      instagram:'',
      whatsapp:'',
      logo:''
    },
    settings: {
      primary:'#aa2027',
      secondary:'#e47d3e',
      dark:false,
      orderPrefix:'SS',
      minimumOrder:0,
      tax:0,
      service:0,
      stockThreshold:5,
      currency:'IDR',
      timezone:'Asia/Jakarta',
      dateFormat:'id-ID'
    },
    admin: {
      name:'Admin Selera',
      username:'admin',
      password:'admin123',
      avatar:''
    }
  },
  get(k) {
    try {
      return JSON.parse(localStorage.getItem(this.prefix+k))??(this.defaults[k]||[])
    }
    catch {
      return this.defaults[k]||[]
    }
  },
  set(k,
  v) {
    localStorage.setItem(this.prefix+k,
    JSON.stringify(v));
    window.dispatchEvent(new CustomEvent('ss-data',
     {
      detail:k
    }));
    return v
  },
  remove(k) {
    localStorage.removeItem(this.prefix+k);
    window.dispatchEvent(new CustomEvent('ss-data',
     {
      detail:k
    }))
  },
  id(prefix='ID') {
    return prefix+'-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,
    6)
  },
  all() {
    return this.keys.reduce((o,
    k)=>(o[k]=this.get(k),
    o),
     {
    })
  },
  reset() {
    this.keys.forEach(k=>localStorage.removeItem(this.prefix+k));
    window.dispatchEvent(new CustomEvent('ss-data'))
  },
  backup() {
    return JSON.stringify(this.all(),
    null,
    2)
  },
  restore(data) {
    this.keys.forEach(k=> {
      if(data[k]!==undefined)this.set(k,
      data[k])
    })
  }
};
