Faye.Engine = {
  get: function(options) {
    return new Faye.Engine.Proxy(options);
  },
  
  METHODS: ['createClient', 'clientExists', 'destroyClient', 'ping', 'subscribe', 'unsubscribe']
};

Faye.Engine.Proxy = Faye.Class({
  MAX_DELAY:  <%= Faye::Engine::MAX_DELAY %>,
  INTERVAL:   <%= Faye::Engine::INTERVAL %>,
  TIMEOUT:    <%= Faye::Engine::TIMEOUT %>,
  
  className: 'Engine',
  
  initialize: function(options) {
    this._options     = options || {};
    this._connections = {};
    this.interval     = this._options.interval || this.INTERVAL;
    this.timeout      = this._options.timeout  || this.TIMEOUT;
    
    var engineClass = this._options.type || Faye.Engine.Memory;
    this._engine    = engineClass.create(this, this._options);
    
    this.debug('Created new engine: ?', this._options);
  },
  
  connect: function(clientId, options, callback, context) {
    this.debug('Accepting connection from ?', clientId);
    this._engine.ping(clientId);
    var conn = this.connection(clientId, true);
    conn.connect(options, callback, context);
    this._engine.emptyQueue(clientId);
  },
  
  hasConnection: function(clientId) {
    return this._connections.hasOwnProperty(clientId);
  },
  
  connection: function(clientId, create) {
    var conn = this._connections[clientId];
    if (conn || !create) return conn;
    return this._connections[clientId] = new Faye.Engine.Connection(this, clientId);
  },
  
  closeConnection: function(clientId) {
    this.debug('Closing connection for ?', clientId);
    delete this._connections[clientId];
  },
  
  openSocket: function(clientId, socket) {
    if (!clientId) return;
    var conn = this.connection(clientId, true);
    conn.socket = socket;
  },
  
  deliver: function(clientId, messages) {
    if (!messages || messages.length === 0) return false;
    
    var conn = this.connection(clientId, false);
    if (!conn) return false;
    
    for (var i = 0, n = messages.length; i < n; i++) {
      conn.deliver(messages[i]);
    }
    return true;
  },
  
  generateId: function() {
    return Faye.random();
  },
  
  flush: function(clientId) {
    if (!clientId) return;
    this.debug('Flushing connection queue for ?', clientId);
    var conn = this.connection(clientId, false);
    if (conn) conn.flush(true);
  },
  
  disconnect: function() {
    if (this._engine.disconnect) return this._engine.disconnect();
  },
  
  publish: function(message) {
    var channels = Faye.Channel.expand(message.channel);
    return this._engine.publish(message, channels);
  }
});

Faye.Engine.METHODS.forEach(function(method) {
  Faye.Engine.Proxy.prototype[method] = function() {
    return this._engine[method].apply(this._engine, arguments);
  };
})

Faye.extend(Faye.Engine.Proxy.prototype, Faye.Publisher);
Faye.extend(Faye.Engine.Proxy.prototype, Faye.Logging);
