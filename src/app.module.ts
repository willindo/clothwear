import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from 'prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ProductsModule } from './module/products/produts.module';
// import { FiltersModule } from './filters/filters.module';
// import { OrdersModule } from './orders/orders.module';
// import { CartModule } from './cart/cart.module';
// import { UsersModule } from './users/users.module';
// import { AuthModule } from './auth/auth.module';
// import { CheckoutModule } from './checkout/checkout.module';
// import { PaymentsModule } from './payments/payments.module';
// import { JwtAuthGuard } from './auth/guards/jwt.guard';
// import { RolesGuard } from './auth/guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`.env.${process.env.NODE_ENV}`, '.env'],
    }),
    JwtModule,
    PrismaModule,
    // AuthModule,
    // UsersModule,
    ProductsModule,
    // CartModule,
    // CheckoutModule,
    // OrdersModule,
    // PaymentsModule,
    // FiltersModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // {
    //   provide: APP_GUARD,
    //   useClass: JwtAuthGuard,
    // },
    // {
    //   provide: APP_GUARD,
    //   useClass: RolesGuard,
    // },
  ],
})
export class AppModule {}
