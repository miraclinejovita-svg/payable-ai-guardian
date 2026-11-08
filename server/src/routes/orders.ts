import { Router, Request, Response } from 'express';
import { OrderService } from '../services/orderService.js';

export const ordersRouter = Router();

// GET /api/demo/orders - Returns authoritative sample demo orders
ordersRouter.get('/', (_req: Request, res: Response) => {
  const orders = OrderService.getAllOrders();
  res.json({
    orders,
    isSimulatedDemo: true,
    total: orders.length,
    message: 'Authoritative demo order records. These are simulated and not real purchases.',
  });
});

// GET /api/demo/orders/:id - Returns a single authoritative order
ordersRouter.get('/:id', (req: Request, res: Response) => {
  const order = OrderService.getOrderById(req.params.id);
  if (!order) {
    res.status(404).json({
      error: 'ORDER_NOT_FOUND',
      message: `No authoritative demo order found with ID "${req.params.id}".`,
    });
    return;
  }
  res.json({ order });
});
