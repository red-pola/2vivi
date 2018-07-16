'use strict';

const {AdminConnection} = require('composer-admin');
const {BusinessNetworkConnection} = require('composer-client');
const {
  NetworkCardStoreManager,
  BusinessNetworkDefinition,
  CertificateUtil,
  IdCard,
} = require('composer-common');
const path = require('path');

const chai = require('chai');
const should = chai.should();
chai.use(require('chai-as-promised'));

const BASE = 'com.redpola.base';
const NS = 'com.redpola.vivi';

describe('2vivi Business Network', () => {
  // In-memory card store for testing so cards are not persisted to the file system
  const cardStore = NetworkCardStoreManager.getCardStore({
    type: 'composer-wallet-inmemory',
  });

  // Embedded connection used for local testing
  const connectionProfile = {
    name: 'embedded',
    'x-type': 'embedded',
  };

  // Name of the business network card containing the administrative identity for the business network
  const adminCardName = 'admin';

  // Admin connection to the blockchain, used to deploy the business network
  let adminConnection;

  // This is the business network connection the tests will use.
  let businessNetworkConnection;

  // This is the factory for creating instances of types.
  let factory;

  // These are a list of receieved events.
  let events;

  let businessNetworkName;

  before(async () => {
    // Generate certificates for use with the embedded connection
    const credentials = CertificateUtil.generate({commonName: 'admin'});

    // Identity used with the admin connection to deploy business networks
    const deployerMetadata = {
      version: 1,
      userName: 'PeerAdmin',
      roles: ['PeerAdmin', 'ChannelAdmin'],
    };
    const deployerCard = new IdCard(deployerMetadata, connectionProfile);
    deployerCard.setCredentials(credentials);
    const deployerCardName = 'PeerAdmin';

    adminConnection = new AdminConnection({cardStore: cardStore});

    await adminConnection.importCard(deployerCardName, deployerCard);
    await adminConnection.connect(deployerCardName);
  });

  /**
   *
   * @param {String} cardName The card name to use for this identity
   * @param {Object} identity The identity details
   */
  async function importCardForIdentity(cardName, identity) {
    const metadata = {
      userName: identity.userID,
      version: 1,
      enrollmentSecret: identity.userSecret,
      businessNetwork: businessNetworkName,
    };
    const card = new IdCard(metadata, connectionProfile);
    await adminConnection.importCard(cardName, card);
  }

  // This is called before each test is executed.
  beforeEach(async () => {
    // Generate a business network definition from the project directory.
    let businessNetworkDefinition = await BusinessNetworkDefinition.fromDirectory(
      path.resolve(__dirname, '..'),
    );
    businessNetworkName = businessNetworkDefinition.getName();
    await adminConnection.install(businessNetworkDefinition);
    const startOptions = {
      networkAdmins: [
        {
          userName: 'admin',
          enrollmentSecret: 'adminpw',
        },
      ],
    };
    const adminCards = await adminConnection.start(
      businessNetworkName,
      businessNetworkDefinition.getVersion(),
      startOptions,
    );
    await adminConnection.importCard(adminCardName, adminCards.get('admin'));

    // Create and establish a business network connection
    businessNetworkConnection = new BusinessNetworkConnection({
      cardStore: cardStore,
    });
    events = [];
    businessNetworkConnection.on('event', event => {
      events.push(event);
    });
    await businessNetworkConnection.connect(adminCardName);

    // Get the factory for the business network.
    factory = businessNetworkConnection.getBusinessNetwork().getFactory();

    // Get participant registries.
    const buyerRegistry = await businessNetworkConnection.getParticipantRegistry(
      `${NS}.Buyer`,
    );
    const sellerRegistry = await businessNetworkConnection.getParticipantRegistry(
      `${NS}.Seller`,
    );

    // Create the buyers.
    const buyer1 = factory.newResource(NS, 'Buyer', '1');
    buyer1.firstName = '#1';
    buyer1.lastName = 'Buyer';
    buyer1.email = 'buyer1@example.com';
    buyer1.address = factory.newConcept(BASE, 'Address');
    buyer1.address.street = '1 Trần Huy Liệu';
    buyer1.address.ward = '15';
    buyer1.address.district = 'Phú Nhuận';
    buyer1.address.province = 'HCM';

    const buyer2 = factory.newResource(NS, 'Buyer', '2');
    buyer2.firstName = '#2';
    buyer2.lastName = 'Buyer';
    buyer2.email = 'buyer2@example.com';
    buyer2.address = factory.newConcept(BASE, 'Address');
    buyer2.address.street = '11 Trần Huy Liệu';
    buyer2.address.ward = '15';
    buyer2.address.district = 'Phú Nhuận';
    buyer2.address.province = 'HCM';

    await buyerRegistry.addAll([buyer1, buyer2]);

    // Create the sellers.
    const seller1 = factory.newResource(NS, 'Seller', '1');
    seller1.firstName = '#1';
    seller1.lastName = 'Seller';
    seller1.email = 'seller1@example.com';
    seller1.storeName = 'Store #1';
    seller1.address = factory.newConcept(BASE, 'Address');
    seller1.address.street = '2 Trần Huy Liệu';
    seller1.address.ward = '15';
    seller1.address.district = 'Phú Nhuận';
    seller1.address.province = 'HCM';

    const seller2 = factory.newResource(NS, 'Seller', '2');
    seller2.firstName = '#2';
    seller2.lastName = 'Seller';
    seller2.email = 'seller2@example.com';
    seller2.storeName = 'Store #2';
    seller2.address = factory.newConcept(BASE, 'Address');
    seller2.address.street = '22 Trần Huy Liệu';
    seller2.address.ward = '15';
    seller2.address.district = 'Phú Nhuận';
    seller2.address.province = 'HCM';

    await sellerRegistry.addAll([seller1, seller2]);

    // Get asset registries.
    const productRegistry = await businessNetworkConnection.getAssetRegistry(
      `${NS}.Product`,
    );
    const orderRegistry = await businessNetworkConnection.getAssetRegistry(
      `${NS}.Order`,
    );

    // Create the products.
    const product1 = factory.newResource(NS, 'Product', '1');
    product1.name = 'Product #1';
    product1.description = 'Product #1 description';
    product1.price = 12000;
    product1.quantity = 10;
    product1.providerName = 'Provider #1';

    const product2 = factory.newResource(NS, 'Product', '2');
    product2.name = 'Product #2';
    product2.description = 'Product #2 description';
    product2.price = 22000;
    product2.quantity = 5;
    product2.providerName = 'Provider #1';

    await productRegistry.addAll([product1, product2]);

    // Issue the identities.
    let identity = await businessNetworkConnection.issueIdentity(
      `${NS}.Buyer#1`,
      'buyer1',
    );
    await importCardForIdentity('buyer1', identity);

    identity = await businessNetworkConnection.issueIdentity(
      `${NS}.Buyer#2`,
      'buyer2',
    );
    await importCardForIdentity('buyer2', identity);

    identity = await businessNetworkConnection.issueIdentity(
      `${NS}.Seller#1`,
      'seller1',
    );
    await importCardForIdentity('seller1', identity);

    identity = await businessNetworkConnection.issueIdentity(
      `${NS}.Seller#2`,
      'seller2',
    );
    await importCardForIdentity('seller2', identity);
  });

  /**
   * Reconnect using a different identity.
   * @param {String} cardName The name of the card for the identity to use
   */
  async function useIdentity(cardName) {
    await businessNetworkConnection.disconnect();
    businessNetworkConnection = new BusinessNetworkConnection({
      cardStore: cardStore,
    });
    events = [];
    businessNetworkConnection.on('event', event => {
      events.push(event);
    });
    await businessNetworkConnection.connect(cardName);
    factory = businessNetworkConnection.getBusinessNetwork().getFactory();
  }

  describe('Buyer participant', () => {
    /**
     * Create and submit creating order transaction
     */
    async function createOrder(id, buyerID, sellerID, items) {
      const orderRegistry = await businessNetworkConnection.getAssetRegistry(
        `${NS}.Order`,
      );

      const order = factory.newResource(NS, 'Order', id);
      order.status = 'SUBMITTED';
      order.memo = '';
      order.amount = 0;
      order.items = items;
      order.buyer = factory.newRelationship(NS, 'Buyer', buyerID);

      await orderRegistry.add(order);

      const orderCreating = factory.newTransaction(NS, 'OrderCreating');
      orderCreating.paymentMethod = 'COD';
      orderCreating.buyer = factory.newRelationship(NS, 'Buyer', buyerID);
      orderCreating.seller = factory.newRelationship(NS, 'Seller', sellerID);
      orderCreating.order = factory.newRelationship(
        NS,
        'Order',
        order.getIdentifier(),
      );

      await businessNetworkConnection.submitTransaction(orderCreating);

      return order;
    }

    it('can see all of the products', async () => {
      // Use the identity for buyer1.
      await useIdentity('buyer1');

      const productRegistry = await businessNetworkConnection.getAssetRegistry(
        `${NS}.Product`,
      );
      const products = await productRegistry.getAll();

      // Validate.
      products.should.have.lengthOf(2);

      const [product1, product2] = products;

      product1.providerName.should.equal('Provider #1');
      product1.price.should.equal(12000);

      product1.providerName.should.equal('Provider #1');
      product2.price.should.equal(22000);
    });

    it('cannot place an order without any items', async () => {
      const orderRegistry = await businessNetworkConnection.getAssetRegistry(
        `${NS}.Order`,
      );

      await useIdentity('buyer1');

      await createOrder('1', '1', '1', []).should.be.rejectedWith(
        /Cannot place an order without any items/,
      );
    });

    it('cannot place an order which exceed the product quantity', async () => {
      const orderRegistry = await businessNetworkConnection.getAssetRegistry(
        `${NS}.Order`,
      );

      await useIdentity('buyer1');

      const item = factory.newConcept(NS, 'OrderItem');
      item.quantity = 20;
      item.product = factory.newRelationship(NS, 'Product', '1');

      await createOrder('1', '1', '1', [item]).should.be.rejectedWith(/Product (.*) only has (.*) item[s]* left/);
    });

    it('can place an order', async () => {
      await useIdentity('buyer1');

      const orderRegistry = await businessNetworkConnection.getAssetRegistry(
        `${NS}.Order`,
      );

      const items = [];

      let item = factory.newConcept(NS, 'OrderItem');
      item.quantity = 2;
      item.product = factory.newRelationship(NS, 'Product', '1');
      items.push(item);

      item = factory.newConcept(NS, 'OrderItem');
      item.quantity = 1;
      item.product = factory.newRelationship(NS, 'Product', '2');
      items.push(item);

      const order = await createOrder('1', '1', '1', items);
      const updatedOrder = await orderRegistry.get(order.getIdentifier());

      updatedOrder.buyer.getIdentifier().should.equal('1');
      updatedOrder.seller.getIdentifier().should.equal('1');
      should.exist(updatedOrder.created);
      updatedOrder.paymentMethod.should.equal('COD');
      updatedOrder.amount.should.equal(12000 * 2 + 22000);

      events.length.should.equal(1);
      events[0].getType().should.equal('OrderCreated');
    });

    it('can read their own orders', async () => {
      const orderRegistry = await businessNetworkConnection.getAssetRegistry(
        `${NS}.Order`,
      );

      await useIdentity('buyer1');

      let orders = await orderRegistry.getAll();
      orders.length.should.equal(0);

      const item = factory.newConcept(NS, 'OrderItem');
      item.quantity = 2;
      item.product = factory.newRelationship(NS, 'Product', '1');

      await createOrder('1', '1', '1', [item]);

      orders = await orderRegistry.getAll();
      orders.length.should.equal(1);
      orders[0].buyer.getIdentifier().should.equal('1');
    });

    it('cannot read other\'s orders', async () => {
      await useIdentity('buyer1');
      let orderRegistry = await businessNetworkConnection.getAssetRegistry(
        `${NS}.Order`,
      );

      const item = factory.newConcept(NS, 'OrderItem');
      item.quantity = 2;
      item.product = factory.newRelationship(NS, 'Product', '1');

      await createOrder('1', '1', '1', [item]);
      let orders = await orderRegistry.getAll();
      orders.length.should.equal(1);

      await useIdentity('buyer2');
      orderRegistry = await businessNetworkConnection.getAssetRegistry(
        `${NS}.Order`,
      );
      orders = await orderRegistry.getAll();
      orders.length.should.equal(0);
    });
  });
});
