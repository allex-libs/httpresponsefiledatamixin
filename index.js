function createMixin (execlib) {
  'use strict';

  var lib = execlib.lib,
    qlib = lib.qlib,
    JobBase = qlib.JobBase;

  function DataSinkStreamer (csvfile, sink, filter, visiblefields, generationoptions, defer) {
    JobBase.call(this, defer);
    this.csvfile = csvfile;
    this.sink = sink;
    this.filter = filter;
    this.visiblefields = visiblefields;
    this.queryID = null;
    this.producer = new this.csvfile.ContentsFromDataProducer(this.csvfile, this.sink.recordDescriptor.fields, generationoptions);
  }
  lib.inherit(DataSinkStreamer, JobBase);
  DataSinkStreamer.prototype.destroy = function () {
    if (this.sink && this.queryID) {
      this.sink.sessionCall('closeQuery', this.queryID);
    }
    if (this.producer) {
      this.producer.destroy();
    }
    this.producer = null;
    this.queryID = null;
    this.visiblefields = null;
    this.filter = null;
    this.sink = null;
    this.csvfile = null;
    JobBase.prototype.destroy.call(this);
  };
  DataSinkStreamer.prototype.go = function () {
    if (!this.sink) {
      this.resolve(null);
      return;
    }
    this.sink.sessionCall('query', {singleshot: false, continuous: true, filter: this.filter, visiblefields: this.visiblefields}).then(
      null, this.reject.bind(this), this.onStream.bind(this)
    );
  };
  DataSinkStreamer.prototype.onStream = function (item) {
    if (!lib.isArray(item)) {
      return;
    }
    switch (item[0]) {
      case 'i':
        this.queryID = item[1];
        break;
      case 'r1':
        //this.data = this.csvfile.rowProducer(this.sink.recordDescriptor.fields, this.data, item[2]); 
        this.producer.produceRow(item[2]); 
        break;
      case 're':
        this.producer.finalize();
        this.resolve(this.producer.data);
        break;
    }
  };


  function ContentsFromDataProducer (file, datafields, options) {
    this.file = file;
    this.datafields = datafields;
    this.options = options;
    this.data = this.initialData();
  }
  ContentsFromDataProducer.prototype.destroy = function () {
    this.options = null;
    this.datafields = null;
    this.file = null;
  };
  ContentsFromDataProducer.prototype.initialData = function () {
    throw new lib.Error('NOT_IMPLEMENTED', this.constructor.name+' does not implement initialData');
  };
  ContentsFromDataProducer.prototype.produceRow = function (dataobject) {
    throw new lib.Error('NOT_IMPLEMENTED', this.constructor.name+' does not implement produceRow');
  };
  ContentsFromDataProducer.prototype.finalize = function () {
  };


  function HttpResponseFileDataMixin (includeheaders) {
    this.includeHeaders = includeheaders || false;
  };
  HttpResponseFileDataMixin.prototype.destroy = function () {
    this.includeheaders = null;
  };
  HttpResponseFileDataMixin.prototype.headerName = function (field) {
    return this.fieldContents(field[this.headerNameTitleName] || field[this.headerNameFieldName]);
  };
  HttpResponseFileDataMixin.prototype.fieldContents = function (string) {
    return string;
  };
  HttpResponseFileDataMixin.prototype.streamInFromDataSink = function (sink, filter, visiblefields, options) {
    var job = new DataSinkStreamer(this, sink, filter, visiblefields, options), ret = job.defer.promise;
    job.go();
    return ret;
  };
  HttpResponseFileDataMixin.prototype.produceFromDataArray = function (datafields, dataarray, options) {
    var producer = new this.ContentsFromDataProducer(this, datafields, options), ret;
    dataarray.forEach(producer.produceRow.bind(producer));
    producer.finalize();
    ret = producer.data;
    producer.destroy();
    producer = null;
    return ret;
  };
  HttpResponseFileDataMixin.prototype.headerNameFieldName = 'name';
  HttpResponseFileDataMixin.prototype.headerNameTitleName = 'title';
  HttpResponseFileDataMixin.prototype.ContentsFromDataProducer = ContentsFromDataProducer;

  HttpResponseFileDataMixin.addMethods = function (klass) {
    lib.inheritMethods(klass, HttpResponseFileDataMixin
      ,'headerName'
      ,'fieldContents'
      ,'streamInFromDataSink'
      ,'produceFromDataArray'
      ,'headerNameFieldName'
      ,'headerNameTitleName'
      ,'ContentsFromDataProducer'
    );
  };


  return {
    Mixin: HttpResponseFileDataMixin
  };
}

module.exports = createMixin;

