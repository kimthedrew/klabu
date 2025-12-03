import { prisma } from '../prismaClient';
import { io } from '../index';

export class DeliveryAssignmentService {
  private static assignmentTimers = new Map<string, NodeJS.Timeout>();

  /**
   * Start the delivery assignment process for an order
   */
  static async startAssignmentProcess(orderId: string): Promise<void> {
    try {
      // Get order details
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          stall: {
            include: {
              stallOwner: true
            }
          }
        }
      });

      if (!order) {
        throw new Error('Order not found');
      }

      if (order.status !== 'READY_FOR_DELIVERY') {
        throw new Error('Order is not ready for delivery assignment');
      }

      // Get available delivery persons
      const availableDeliveryPersons = await prisma.deliveryPerson.findMany({
        where: {
          isActive: true,
          isApproved: true
        },
        orderBy: {
          rating: 'desc'
        }
      });

      if (availableDeliveryPersons.length === 0) {
        // Notify stall owner that no delivery persons are available
        io.to(`stall-${order.stallId}`).emit('no-delivery-persons-available', {
          orderId,
          message: 'No delivery persons are currently available'
        });
        return;
      }

      // Start assignment with first available delivery person
      await this.assignToNextDeliveryPerson(orderId, availableDeliveryPersons, 0);
    } catch (error) {
      console.error('Error starting delivery assignment:', error);
      throw error;
    }
  }

  /**
   * Assign order to a specific delivery person
   */
  private static async assignToNextDeliveryPerson(
    orderId: string, 
    availableDeliveryPersons: any[], 
    index: number
  ): Promise<void> {
    if (index >= availableDeliveryPersons.length) {
      // No more delivery persons available
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { stall: true }
      });

      if (order) {
        io.to(`stall-${order.stallId}`).emit('no-delivery-persons-available', {
          orderId,
          message: 'All available delivery persons have been contacted'
        });
      }
      return;
    }

    const deliveryPerson = availableDeliveryPersons[index];
    const expiresAt = new Date(Date.now() + 90 * 1000); // 90 seconds from now

    try {
      // Create assignment record
      const assignment = await prisma.deliveryAssignment.create({
        data: {
          orderId,
          deliveryPersonId: deliveryPerson.id,
          status: 'PENDING',
          expiresAt
        },
        include: {
          order: {
            include: {
              stall: {
                include: {
                  stallOwner: true
                }
              }
            }
          },
          deliveryPerson: true
        }
      });

      // Notify the delivery person
      io.to(`delivery-${deliveryPerson.id}`).emit('delivery-assignment', {
        assignmentId: assignment.id,
        orderId,
        customerName: assignment.order.customerName,
        deliveryLocation: assignment.order.deliveryLocation,
        roomNumber: assignment.order.roomNumber,
        totalAmount: assignment.order.totalAmount,
        deliveryFee: assignment.order.deliveryFee,
        stallName: assignment.order.stall.name,
        expiresAt: expiresAt.toISOString()
      });

      // Set timer to move to next delivery person if no response
      const timer = setTimeout(async () => {
        await this.handleAssignmentTimeout(assignment.id, orderId, availableDeliveryPersons, index + 1);
      }, 90000); // 90 seconds

      this.assignmentTimers.set(assignment.id, timer);

      console.log(`Assigned order ${orderId} to delivery person ${deliveryPerson.fullName} (${deliveryPerson.id})`);
    } catch (error) {
      console.error('Error assigning delivery person:', error);
      // Try next delivery person
      await this.assignToNextDeliveryPerson(orderId, availableDeliveryPersons, index + 1);
    }
  }

  /**
   * Handle assignment timeout - move to next delivery person
   */
  private static async handleAssignmentTimeout(
    assignmentId: string,
    orderId: string,
    availableDeliveryPersons: any[],
    nextIndex: number
  ): Promise<void> {
    try {
      // Update assignment status to expired
      await prisma.deliveryAssignment.update({
        where: { id: assignmentId },
        data: { 
          status: 'EXPIRED',
          respondedAt: new Date()
        }
      });

      // Clear timer
      const timer = this.assignmentTimers.get(assignmentId);
      if (timer) {
        clearTimeout(timer);
        this.assignmentTimers.delete(assignmentId);
      }

      // Move to next delivery person
      await this.assignToNextDeliveryPerson(orderId, availableDeliveryPersons, nextIndex);

      console.log(`Assignment ${assignmentId} expired, moving to next delivery person`);
    } catch (error) {
      console.error('Error handling assignment timeout:', error);
    }
  }

  /**
   * Accept delivery assignment
   */
  static async acceptAssignment(assignmentId: string, deliveryPersonId: string): Promise<void> {
    try {
      // Verify assignment exists and is still pending
      const assignment = await prisma.deliveryAssignment.findFirst({
        where: {
          id: assignmentId,
          deliveryPersonId,
          status: 'PENDING'
        },
        include: {
          order: {
            include: {
              stall: true
            }
          },
          deliveryPerson: true
        }
      });

      if (!assignment) {
        throw new Error('Assignment not found or already responded to');
      }

      // Check if assignment has expired
      if (new Date() > assignment.expiresAt) {
        throw new Error('Assignment has expired');
      }

      // Update assignment status
      await prisma.deliveryAssignment.update({
        where: { id: assignmentId },
        data: {
          status: 'ACCEPTED',
          respondedAt: new Date()
        }
      });

      // Update order with delivery person
      await prisma.order.update({
        where: { id: assignment.orderId },
        data: {
          deliveryPersonId: deliveryPersonId,
          deliveryStatus: 'ASSIGNED',
          deliveryAcceptedAt: new Date()
        }
      });

      // Create delivery record
      await prisma.delivery.create({
        data: {
          orderId: assignment.orderId,
          deliveryPersonId: deliveryPersonId,
          status: 'ASSIGNED',
          acceptedAt: new Date()
        }
      });

      // Clear timer if exists
      const timer = this.assignmentTimers.get(assignmentId);
      if (timer) {
        clearTimeout(timer);
        this.assignmentTimers.delete(assignmentId);
      }

      // Notify stall owner
      io.to(`stall-${assignment.order.stallId}`).emit('delivery-accepted', {
        orderId: assignment.orderId,
        deliveryPerson: {
          id: assignment.deliveryPerson.id,
          fullName: assignment.deliveryPerson.fullName,
          phoneNumber: assignment.deliveryPerson.phoneNumber,
          rating: assignment.deliveryPerson.rating
        }
      });

      console.log(`Assignment ${assignmentId} accepted by delivery person ${deliveryPersonId}`);
    } catch (error) {
      console.error('Error accepting assignment:', error);
      throw error;
    }
  }

  /**
   * Reject delivery assignment
   */
  static async rejectAssignment(
    assignmentId: string, 
    deliveryPersonId: string, 
    reason: string
  ): Promise<void> {
    try {
      // Verify assignment exists and is still pending
      const assignment = await prisma.deliveryAssignment.findFirst({
        where: {
          id: assignmentId,
          deliveryPersonId,
          status: 'PENDING'
        },
        include: {
          order: true
        }
      });

      if (!assignment) {
        throw new Error('Assignment not found or already responded to');
      }

      // Update assignment status
      await prisma.deliveryAssignment.update({
        where: { id: assignmentId },
        data: {
          status: 'REJECTED',
          respondedAt: new Date()
        }
      });

      // Create rejection record
      await prisma.deliveryRejection.create({
        data: {
          assignmentId,
          reason,
          rejectedBy: 'DELIVERY_PERSON'
        }
      });

      // Clear timer if exists
      const timer = this.assignmentTimers.get(assignmentId);
      if (timer) {
        clearTimeout(timer);
        this.assignmentTimers.delete(assignmentId);
      }

      // Get available delivery persons for next assignment
      const availableDeliveryPersons = await prisma.deliveryPerson.findMany({
        where: {
          isActive: true,
          isApproved: true,
          id: { not: deliveryPersonId } // Exclude the one who rejected
        },
        orderBy: {
          rating: 'desc'
        }
      });

      // Move to next delivery person
      await this.assignToNextDeliveryPerson(assignment.orderId, availableDeliveryPersons, 0);

      console.log(`Assignment ${assignmentId} rejected by delivery person ${deliveryPersonId}`);
    } catch (error) {
      console.error('Error rejecting assignment:', error);
      throw error;
    }
  }

  /**
   * Stall owner rejects assigned delivery person
   */
  static async stallOwnerRejectDelivery(
    orderId: string,
    stallOwnerId: string,
    reason: string
  ): Promise<void> {
    try {
      // Verify order belongs to stall owner
      const order = await prisma.order.findFirst({
        where: {
          id: orderId,
          stall: {
            stallOwnerId
          }
        },
        include: {
          assignments: {
            where: {
              status: 'ACCEPTED'
            },
            include: {
              deliveryPerson: true
            }
          }
        }
      });

      if (!order) {
        throw new Error('Order not found or access denied');
      }

      if (order.assignments.length === 0) {
        throw new Error('No accepted delivery assignment found');
      }

      const acceptedAssignment = order.assignments[0];

      // Update assignment status
      await prisma.deliveryAssignment.update({
        where: { id: acceptedAssignment.id },
        data: {
          status: 'REJECTED',
          respondedAt: new Date()
        }
      });

      // Create rejection record
      await prisma.deliveryRejection.create({
        data: {
          assignmentId: acceptedAssignment.id,
          reason,
          rejectedBy: 'STALL_OWNER'
        }
      });

      // Remove delivery person from order
      await prisma.order.update({
        where: { id: orderId },
        data: {
          deliveryPersonId: null,
          deliveryStatus: 'PENDING'
        }
      });

      // Delete delivery record if exists
      await prisma.delivery.deleteMany({
        where: { orderId }
      });

      // Get available delivery persons (excluding the rejected one)
      const availableDeliveryPersons = await prisma.deliveryPerson.findMany({
        where: {
          isActive: true,
          isApproved: true,
          id: { not: acceptedAssignment.deliveryPersonId }
        },
        orderBy: {
          rating: 'desc'
        }
      });

      // Start new assignment process
      await this.assignToNextDeliveryPerson(orderId, availableDeliveryPersons, 0);

      console.log(`Stall owner rejected delivery person for order ${orderId}`);
    } catch (error) {
      console.error('Error in stall owner rejection:', error);
      throw error;
    }
  }

  /**
   * Confirm delivery pickup by stall owner
   */
  static async confirmDeliveryPickup(orderId: string, stallOwnerId: string): Promise<void> {
    try {
      // Verify order belongs to stall owner
      const order = await prisma.order.findFirst({
        where: {
          id: orderId,
          stall: {
            stallOwnerId
          }
        },
        include: {
          deliveryPerson: true
        }
      });

      if (!order) {
        throw new Error('Order not found or access denied');
      }

      if (!order.deliveryPersonId) {
        throw new Error('No delivery person assigned to this order');
      }

      // Update order and delivery status
      await prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'OUT_FOR_DELIVERY',
          deliveryStatus: 'PICKED_UP'
        }
      });

      await prisma.delivery.updateMany({
        where: { orderId },
        data: {
          status: 'PICKED_UP'
        }
      });

      // Notify delivery person
      io.to(`delivery-${order.deliveryPersonId}`).emit('delivery-picked-up', {
        orderId,
        message: 'Delivery confirmed picked up by stall owner'
      });

      console.log(`Delivery pickup confirmed for order ${orderId}`);
    } catch (error) {
      console.error('Error confirming delivery pickup:', error);
      throw error;
    }
  }
}































