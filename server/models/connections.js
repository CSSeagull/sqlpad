import _ from 'lodash';
import Cryptr from 'cryptr';
import drivers from '../drivers/index.js';
import validateConnection from '../lib/validate-connection.js';

class Connections {
  /**
   * @param {import('../sequelize-db')} sequelizeDb
   * @param {import('../lib/config')} config
   */
  constructor(sequelizeDb, config) {
    this.sequelizeDb = sequelizeDb;
    this.config = config;
    this.cryptr = new Cryptr(config.get('passphrase'));
  }

  decorateConnection(connection) {
    if (!connection) {
      return connection;
    }
    const copy = _.cloneDeep(connection);
    copy.maxRows = Number(this.config.get('queryResultMaxRows'));
    const driver = drivers[connection.driver];
    if (!driver) {
      copy.supportsConnectionClient = false;
      copy.isAsynchronous = false;
    } else {
      copy.supportsConnectionClient = Boolean(
        drivers[connection.driver].Client
      );
      copy.isAsynchronous = Boolean(drivers[connection.driver].asynchronous);
    }

    // For legacy use, spread driver-field data onto connection object
    if (copy.data) {
      Object.assign(copy, copy.data);
    }

    return copy;
  }

  decipherConnection(connection) {
    if (connection.data && typeof connection.data === 'string') {
      try {
        // Skip decryption; assume data is plain JSON
        connection.data = JSON.parse(connection.data);
      } catch (err) {
        console.warn('Failed to parse connection.data as JSON:', err);
      }
    }

    return connection;
  }

  async findAll() {
    const dbConnections = await this.sequelizeDb.Connections.findAll({
      attributes: [
        'id',
        'name',
        'description',
        'driver',
        'multiStatementTransactionEnabled',
        'idleTimeoutSeconds',
        'createdAt',
        'updatedAt',
      ],
    });

    const dbConnectionsJson = dbConnections.map((conn) => {
      const jsonConn = conn.toJSON();
      jsonConn.deletable = true; // <-- Key line
      return this.decorateConnection(jsonConn);
    });

    const vaultConnections = this.config.getConnections().map((conn) => {
      return this.decorateConnection({
        ...conn,
        deletable: false, // <-- So we can't delete connection from vault, safety method
      });
    });

    return _.sortBy([...dbConnectionsJson, ...vaultConnections], (c) =>
      c.name.toLowerCase()
    );
  }

  async findOneById(id) {
    let connection = await this.sequelizeDb.Connections.findOne({
      where: { id },
    });
    if (connection) {
      connection = connection.toJSON();
      connection.editable = true;
      connection = this.decipherConnection(connection);
      return this.decorateConnection(connection);
    }

    const connectionFromEnv = this.config
      .getConnections()
      .find((connection) => connection.id === id);

    if (!connectionFromEnv) {
      return null;
    }
    return this.decorateConnection(connectionFromEnv);
  }

  async removeOneById(id) {
    return this.sequelizeDb.Connections.destroy({ where: { id } });
  }

  /**
   * @param {object} connection
   */
  async create(connection) {
    /*
    const {
      id,
      name,
      description,
      driver,
      multiStatementTransactionEnabled,
      idleTimeoutSeconds,
      data,
      createdAt,
      updatedAt,
      ...legacyDriverFields
    } = connection;
  
    let createObj = {
      id,
      name,
      description,
      driver,
      multiStatementTransactionEnabled,
      idleTimeoutSeconds,
    };

    if (data) {
      createObj.data = data;
    } else {
      createObj.data = legacyDriverFields;
    }

    createObj = validateConnection(createObj);

    // Skip encryption — assume data is plain JSON
    createObj.data = JSON.stringify(createObj.data);

    const created = await this.sequelizeDb.Connections.create(createObj);
    return this.findOneById(created.id);
    */
    throw new Error(
      'Connection update is disabled. Use Vault-based configuration.'
    );
  }

  /**
   * @param {string} id
   * @param {object} connection
   */
  async update(id, connection) {
    /*
    
    if (!connection) {
      throw new Error('connection required');
    }

    const clone = { ...connection };
    delete clone.id;
    
    const {
      name,
      description,
      driver,
      multiStatementTransactionEnabled,
      idleTimeoutSeconds,
      data,
      createdAt,
      updatedAt,
      ...legacyDriverFields
    } = clone;
 /*
    let updateObj = {
      id,
      name,
      description,
      driver,
      multiStatementTransactionEnabled,
      idleTimeoutSeconds,
    };

    if (data) {
      updateObj.data = data;
    } else {
      updateObj.data = legacyDriverFields;
    }

    updateObj = validateConnection(updateObj);

    // Skip encryption — assume data is plain JSON
    updateObj.data = JSON.stringify(updateObj.data);

    await this.sequelizeDb.Connections.update(updateObj, { where: { id } });
    return this.findOneById(id);
    */
    throw new Error(
      'Connection update is disabled. Use Vault-based configuration.'
    );
  }
}

export default Connections;

/*
import _ from 'lodash';
import Cryptr from 'cryptr';
import drivers from '../drivers/index.js';
import validateConnection from '../lib/validate-connection.js';

class Connections {

   * @param {import('../sequelize-db')} sequelizeDb
   * @param {import('../lib/config')} config

  constructor(sequelizeDb, config) {
    this.sequelizeDb = sequelizeDb;
    this.config = config;
    this.cryptr = new Cryptr(config.get('passphrase'));
  }

  decorateConnection(connection) {
    if (!connection) {
      return connection;
    }
    const copy = _.cloneDeep(connection);
    copy.maxRows = Number(this.config.get('queryResultMaxRows'));
    const driver = drivers[connection.driver];
    if (!driver) {
      copy.supportsConnectionClient = false;
      copy.isAsynchronous = false;
    } else {
      copy.supportsConnectionClient = Boolean(
        drivers[connection.driver].Client
      );
      copy.isAsynchronous = Boolean(drivers[connection.driver].asynchronous);
    }

    // For legacy use, spread driver-field data onto connection object
    // This isn't great but needed for backwards compat at this time
    if (copy.data) {
      Object.assign(copy, copy.data);
    }

    return copy;
  }

  decipherConnection(connection) {
    if (connection.data && typeof connection.data === 'string') {
      connection.data = JSON.parse(this.cryptr.decrypt(connection.data));
    }

    return connection;
  }

  async findAll() {
    let connectionsFromDb = await this.sequelizeDb.Connections.findAll({
      attributes: [
        'id',
        'name',
        'description',
        'driver',
        'multiStatementTransactionEnabled',
        'idleTimeoutSeconds',
        'createdAt',
        'updatedAt',
      ],
    });
    connectionsFromDb = connectionsFromDb.map((conn) => {
      let jsonConn = conn.toJSON();
      jsonConn.editable = true;
      return jsonConn;
    });

    const allConnections = connectionsFromDb
      .concat(this.config.getConnections())
      .map((connection) => this.decorateConnection(connection));

    return _.sortBy(allConnections, (c) => c.name.toLowerCase());
  }

  async findOneById(id) {
    let connection = await this.sequelizeDb.Connections.findOne({
      where: { id },
    });
    if (connection) {
      connection = connection.toJSON();
      connection.editable = true;
      connection = this.decipherConnection(connection);
      return this.decorateConnection(connection);
    }

    // If connection was not found in db try env
    const connectionFromEnv = this.config
      .getConnections()
      .find((connection) => connection.id === id);

    if (!connectionFromEnv) {
      return null;
    }
    return this.decorateConnection(connectionFromEnv);
  }

  async removeOneById(id) {
    return this.sequelizeDb.Connections.destroy({ where: { id } });
  }

  /**
   *
   * @param {object} connection
   
  async create(connection) {
    const {
      id,
      name,
      description,
      driver,
      multiStatementTransactionEnabled,
      idleTimeoutSeconds,
      data,
      createdAt,
      updatedAt,
      ...legacyDriverFields
    } = connection;

    let createObj = {
      id,
      name,
      description,
      driver,
      multiStatementTransactionEnabled,
      idleTimeoutSeconds,
    };

    // Old connections had driver-specific fields flat on connection object
    // With v5 those moved to data, but the old format needs to be supported
    // if data is supplied, we assume that this is a new format
    // if no data, then we assume all fields we don't know about are driver-specific fields
    if (data) {
      createObj.data = data;
    } else {
      createObj.data = legacyDriverFields;
    }

    createObj = validateConnection(createObj);

    // if data is set encrypt it
    if (createObj.data) {
      createObj.data = this.cryptr.encrypt(JSON.stringify(createObj.data));
    }

    const created = await this.sequelizeDb.Connections.create(createObj);
    return this.findOneById(created.id);
  }

  /**
   *
   * @param {string} id - id of connection
   * @param {object} connection - connection object with .data field

  async update(id, connection) {
    if (!connection) {
      throw new Error('connection required');
    }

    // Below uses destructing to deduce legacy driver fields
    // id is already declared in function, so it is being cloned and deleted here
    const clone = { ...connection };
    delete clone.id;

    const {
      name,
      description,
      driver,
      multiStatementTransactionEnabled,
      idleTimeoutSeconds,
      data,
      createdAt,
      updatedAt,
      ...legacyDriverFields
    } = clone;

    let updateObj = {
      id,
      name,
      description,
      driver,
      multiStatementTransactionEnabled,
      idleTimeoutSeconds,
    };

    // Old connections had driver-specific fields flat on connection object
    // With v5 those moved to data, but the old format needs to be supported
    // if data is supplied, we assume that this is a new format
    // if no data, then we assume all fields we don't know about are driver-specific fields
    if (data) {
      updateObj.data = data;
    } else {
      updateObj.data = legacyDriverFields;
    }

    updateObj = validateConnection(updateObj);

    // if data is set encrypt it
    if (updateObj.data) {
      updateObj.data = this.cryptr.encrypt(JSON.stringify(updateObj.data));
    }

    await this.sequelizeDb.Connections.update(updateObj, { where: { id } });
    return this.findOneById(id);
  }


  Dag c airflow ui 
  Не было кнопок на server (3010)
  Задокументировать весь процесс (код dag, настройки vault, secret engine, key value storage )
}
*/
/*
import _ from 'lodash';
import Cryptr from 'cryptr';
import drivers from '../drivers/index.js';
import validateConnection from '../lib/validate-connection.js';

class Connections {

   * @param {import('../sequelize-db')} sequelizeDb
   * @param {import('../lib/config')} config

  constructor(sequelizeDb, config) {
    this.sequelizeDb = sequelizeDb;
    this.config = config;
    this.cryptr = new Cryptr(config.get('passphrase'));
  }

  decorateConnection(connection) {
    if (!connection) {
      return connection;
    }
    const copy = _.cloneDeep(connection);
    copy.maxRows = Number(this.config.get('queryResultMaxRows'));
    const driver = drivers[connection.driver];
    if (!driver) {
      copy.supportsConnectionClient = false;
      copy.isAsynchronous = false;
    } else {
      copy.supportsConnectionClient = Boolean(
        drivers[connection.driver].Client
      );
      copy.isAsynchronous = Boolean(drivers[connection.driver].asynchronous);
    }

    // For legacy use, spread driver-field data onto connection object
    // This isn't great but needed for backwards compat at this time
    if (copy.data) {
      Object.assign(copy, copy.data);
    }

    return copy;
  }

  decipherConnection(connection) {
    if (connection.data && typeof connection.data === 'string') {
      connection.data = JSON.parse(this.cryptr.decrypt(connection.data));
    }

    return connection;
  }

  async findAll() {
    let connectionsFromDb = await this.sequelizeDb.Connections.findAll({
      attributes: [
        'id',
        'name',
        'description',
        'driver',
        'multiStatementTransactionEnabled',
        'idleTimeoutSeconds',
        'createdAt',
        'updatedAt',
      ],
    });
    connectionsFromDb = connectionsFromDb.map((conn) => {
      let jsonConn = conn.toJSON();
      jsonConn.editable = true;
      return jsonConn;
    });

    const allConnections = connectionsFromDb
      .concat(this.config.getConnections())
      .map((connection) => this.decorateConnection(connection));

    return _.sortBy(allConnections, (c) => c.name.toLowerCase());
  }

  async findOneById(id) {
    let connection = await this.sequelizeDb.Connections.findOne({
      where: { id },
    });
    if (connection) {
      connection = connection.toJSON();
      connection.editable = true;
      connection = this.decipherConnection(connection);
      return this.decorateConnection(connection);
    }

    // If connection was not found in db try env
    const connectionFromEnv = this.config
      .getConnections()
      .find((connection) => connection.id === id);

    if (!connectionFromEnv) {
      return null;
    }
    return this.decorateConnection(connectionFromEnv);
  }

  async removeOneById(id) {
    return this.sequelizeDb.Connections.destroy({ where: { id } });
  }

  /**
   *
   * @param {object} connection
   
  async create(connection) {
    const {
      id,
      name,
      description,
      driver,
      multiStatementTransactionEnabled,
      idleTimeoutSeconds,
      data,
      createdAt,
      updatedAt,
      ...legacyDriverFields
    } = connection;

    let createObj = {
      id,
      name,
      description,
      driver,
      multiStatementTransactionEnabled,
      idleTimeoutSeconds,
    };

    // Old connections had driver-specific fields flat on connection object
    // With v5 those moved to data, but the old format needs to be supported
    // if data is supplied, we assume that this is a new format
    // if no data, then we assume all fields we don't know about are driver-specific fields
    if (data) {
      createObj.data = data;
    } else {
      createObj.data = legacyDriverFields;
    }

    createObj = validateConnection(createObj);

    // if data is set encrypt it
    if (createObj.data) {
      createObj.data = this.cryptr.encrypt(JSON.stringify(createObj.data));
    }

    const created = await this.sequelizeDb.Connections.create(createObj);
    return this.findOneById(created.id);
  }

  /**
   *
   * @param {string} id - id of connection
   * @param {object} connection - connection object with .data field

  async update(id, connection) {
    if (!connection) {
      throw new Error('connection required');
    }

    // Below uses destructing to deduce legacy driver fields
    // id is already declared in function, so it is being cloned and deleted here
    const clone = { ...connection };
    delete clone.id;

    const {
      name,
      description,
      driver,
      multiStatementTransactionEnabled,
      idleTimeoutSeconds,
      data,
      createdAt,
      updatedAt,
      ...legacyDriverFields
    } = clone;

    let updateObj = {
      id,
      name,
      description,
      driver,
      multiStatementTransactionEnabled,
      idleTimeoutSeconds,
    };

    // Old connections had driver-specific fields flat on connection object
    // With v5 those moved to data, but the old format needs to be supported
    // if data is supplied, we assume that this is a new format
    // if no data, then we assume all fields we don't know about are driver-specific fields
    if (data) {
      updateObj.data = data;
    } else {
      updateObj.data = legacyDriverFields;
    }

    updateObj = validateConnection(updateObj);

    // if data is set encrypt it
    if (updateObj.data) {
      updateObj.data = this.cryptr.encrypt(JSON.stringify(updateObj.data));
    }

    await this.sequelizeDb.Connections.update(updateObj, { where: { id } });
    return this.findOneById(id);
  }


  Dag c airflow ui 
  Не было кнопок на server (3010)
  Задокументировать весь процесс (код dag, настройки vault, secret engine, key value storage )
}
*/
