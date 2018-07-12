'use strict';

const NS = 'com.redpola.vivi';

const STATUS = {
  SUBMITTED: {value: 'SUBMITTED', message: 'Order submitted'},
  CONFIRMED: {value: 'CONFIRMED', message: 'Order confirmed'},
  CANCELLED: {value: 'CANCELLED', message: 'Order cancelled'},
  DELIVERING: {value: 'DELIVERING', message: 'Order delivering'},
  COMPLETED: {value: 'COMPLETED', message: 'Order completed'},
};

/**
 * Order creating transaction
 * @param {com.redpola.vivi.OrderCreating} tx - order creating transaction
 * @transaction
 */
async function orderCreatingTransaction(tx) {
  tx.order.amount = tx.amount;
  tx.order.paymentMethod = tx.paymentMethod;
  tx.order.buyer = tx.buyer;
  tx.order.seller = tx.seller;
  tx.order.created = tx.timestamp;
  tx.order.status = STATUS.CONFIRMED.value;
  tx.order.memo = STATUS.CONFIRMED.message;

  const orderRegistry = await getAssetRegistry(`${NS}.Order`);

  await orderRegistry.update(tx.order);

  emitOrderEvent('OrderCreated', tx.order);
}

/**
 * emitOrderEvent emits an order event of the type passed in on param 1
 *   all OrderEvents have one extra parameter, which is the order identifier
 * @param {String} event - the event to be emitted
 * @param {com.redpola.vivi.Order} order - the order to be associated with this event
 */
function emitOrderEvent(event, order) {
  const orderEvent = getFactory().newEvent(NS, event);

  orderEvent.orderID = order.$identifier;
  orderEvent.buyerID = order.buyer.$identifier;
  orderEvent.sellerID = order.seller.$identifier;

  switch (event) {
  case 'OrderDeliveryStatusUpdated':
  case 'OrderCompleted':
    orderEvent.shipperID = order.shipper.$identifier;
    break;
  }

  emit(orderEvent);
}
