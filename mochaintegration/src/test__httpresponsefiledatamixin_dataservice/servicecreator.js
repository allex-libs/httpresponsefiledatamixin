function createDataService(execlib, ParentService) {
  'use strict';
  var dataSuite = execlib.dataSuite;

  function factoryCreator(parentFactory) {
    return {
      'service': require('./users/serviceusercreator')(execlib, parentFactory.get('service')),
      'user': require('./users/usercreator')(execlib, parentFactory.get('user')) 
    };
  }

  function DataService(prophash) {
    ParentService.call(this, prophash);
  }
  
  ParentService.inherit(DataService, factoryCreator, require('./storagedescriptor'));
  
  DataService.prototype.__cleanUp = function() {
    ParentService.prototype.__cleanUp.call(this);
  };
  DataService.prototype.createStorage = function(storagedescriptor) {
    return new dataSuite.MemoryStorage(storagedescriptor);
  };
  return DataService;
}

module.exports = createDataService;
