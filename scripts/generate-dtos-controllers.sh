#!/bin/bash
set -e

BASE_DIR=$(pwd)
echo "Running from $BASE_DIR"

# Helper: write file with boilerplate content
write_file() {
  local file="$1"
  local content="$2"

  mkdir -p "$(dirname "$file")"
  echo "$content" > "$file"
  echo "overwrite: $file"
}

### USERS ###
write_file src/users/dto/create-user.dto.ts \
"export class CreateUserDto {
  email: string;
  password: string;
}"

write_file src/users/dto/update-user.dto.ts \
"export class UpdateUserDto {
  email?: string;
  password?: string;
}"

write_file src/users/dto/index.ts \
"export * from './create-user.dto';
export * from './update-user.dto';"

write_file src/users/users.controller.ts \
"import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { CreateUserDto, UpdateUserDto } from './dto';

@Controller('users')
export class UsersController {
  @Get()
  findAll() {
    return 'Get all users';
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return \`Get user \${id}\`;
  }

  @Post()
  create(@Body() dto: CreateUserDto) {
    return \`Create user: \${dto.email}\`;
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return \`Update user \${id}\`;
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return \`Delete user \${id}\`;
  }
}"

### PRODUCTS ###
write_file src/products/dto/create-product.dto.ts \
"export class CreateProductDto {
  name: string;
  price: number;
  description?: string;
  image?: string;
  stock: number;
  category?: string;
}"

write_file src/products/dto/update-product.dto.ts \
"export class UpdateProductDto {
  name?: string;
  price?: number;
  description?: string;
  image?: string;
  stock?: number;
  category?: string;
}"

write_file src/products/dto/index.ts \
"export * from './create-product.dto';
export * from './update-product.dto';"

write_file src/products/products.controller.ts \
"import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { CreateProductDto, UpdateProductDto } from './dto';

@Controller('products')
export class ProductsController {
  @Get()
  findAll() {
    return 'Get all products';
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return \`Get product \${id}\`;
  }

  @Post()
  create(@Body() dto: CreateProductDto) {
    return \`Create product: \${dto.name}\`;
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return \`Update product \${id}\`;
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return \`Delete product \${id}\`;
  }
}"

### CART ###
write_file src/cart/dto/add-to-cart.dto.ts \
"export class AddToCartDto {
  productId: number;
  quantity: number;
}"

write_file src/cart/dto/update-cart-item.dto.ts \
"export class UpdateCartItemDto {
  productId: number;
  quantity: number;
}"

write_file src/cart/dto/remove-from-cart.dto.ts \
"export class RemoveFromCartDto {
  productId: number;
}"

write_file src/cart/dto/index.ts \
"export * from './add-to-cart.dto';
export * from './update-cart-item.dto';
export * from './remove-from-cart.dto';"

write_file src/cart/cart.controller.ts \
"import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { AddToCartDto, UpdateCartItemDto, RemoveFromCartDto } from './dto';

@Controller('cart')
export class CartController {
  @Get()
  findAll() {
    return 'Get cart items';
  }

  @Post()
  add(@Body() dto: AddToCartDto) {
    return \`Add product \${dto.productId} (qty: \${dto.quantity})\`;
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCartItemDto) {
    return \`Update cart item \${id}\`;
  }

  @Delete()
  remove(@Body() dto: RemoveFromCartDto) {
    return \`Remove product \${dto.productId} from cart\`;
  }
}"

### ORDERS ###
write_file src/orders/dto/create-order.dto.ts \
"export class CreateOrderDto {
  userId: number;
  items: { productId: number; quantity: number }[];
}"

write_file src/orders/dto/order-item.dto.ts \
"export class OrderItemDto {
  productId: number;
  quantity: number;
}"

write_file src/orders/dto/index.ts \
"export * from './create-order.dto';
export * from './order-item.dto';"

write_file src/orders/orders.controller.ts \
"import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { CreateOrderDto } from './dto';

@Controller('order')
export class OrdersController {
  @Get()
  findAll() {
    return 'Get all orders';
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return \`Get order \${id}\`;
  }

  @Post()
  create(@Body() dto: CreateOrderDto) {
    return \`Create order for user \${dto.userId} with \${dto.items.length} items\`;
  }
}"
