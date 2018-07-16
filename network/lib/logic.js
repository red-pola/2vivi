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
  if (!tx.order.items.length) {
    throw new Error('Cannot place an order without any items');
  }

  let amount = 0;
  tx.order.items.forEach(item => {
    if (item.quantity > item.product.quantity) {
      throw new Error(
        `Product ${item.product.name} only has ${item.product.quantity} item${
          item.product.quantity === 1 ? '' : 's'
        } left`,
      );
    }

    item.price = item.product.price;
    amount += item.quantity * item.price;
  });

  tx.order.amount = amount;
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
 * Order cancelling transaction
 * @param {com.redpola.vivi.OrderCancelling} tx = order cancelling transaction
 * @transaction
 */
async function orderCancellingTransaction(tx) {
  if (tx.order.status !== STATUS.CONFIRMED.value) {
    throw new Error(`You cannot cancel an order at ${tx.order.status} status`);
  }

  tx.order.cancelled = tx.timestamp;
  tx.order.status = STATUS.CANCELLED.value;
  tx.order.memo = STATUS.CANCELLED.message;

  const orderRegistry = await getAssetRegistry(`${NS}.Order`);

  await orderRegistry.update(tx.order);

  emitOrderEvent('OrderCancelled', tx.order);
}

/**
 * Order delivering transaction
 * @param {com.redpola.vivi.OrderDelivering} tx - order delivering transaction
 * @transaction
 */
async function orderDeliveringTransaction(tx) {
  if (
    tx.order.status !== STATUS.CONFIRMED.value &&
    tx.order.status !== STATUS.DELIVERING.value
  ) {
    throw new Error('Cannot deliver an unconfirmed order');
  }

  tx.order.delivering = tx.timestamp;
  tx.order.status = STATUS.DELIVERING.value;
  tx.order.memo = tx.deliveryStatus;

  const orderRegistry = await getAssetRegistry(`${NS}.Order`);

  await orderRegistry.update(tx.order);

  emitOrderEvent('OrderDeliveryStatusUpdated', tx.order);
}

/**
 * emitOrderEvent emits an order event of the type passed in on param 1
 *   all OrderEvents have one extra parameter, which is the order identifier
 * @param {String} event - the event to be emitted
 * @param {com.redpola.vivi.Order} order - the order to be associated with this event
 */
function emitOrderEvent(event, order) {
  const orderEvent = getFactory().newEvent(NS, event);

  orderEvent.orderID = order.getIdentifier();
  orderEvent.buyerID = order.buyer.getIdentifier();
  orderEvent.sellerID = order.seller.getIdentifier();

  emit(orderEvent);
}
