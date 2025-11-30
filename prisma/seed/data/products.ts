import { title } from 'process';

export const products = [
  {
    title: 'Printed Cotton Tshirt',
    description: 'High quality cotton tshirt with digital print',
    price: 49900,
    categorySlug: 'mens-tshirts',
    attributes: [
      { attribute: 'Color', value: 'Black' },
      { attribute: 'Size', value: 'M' },
    ],
    variants: [
      {
        sku: 'TSHIRT-BLK-M',
        attributes: [
          { attribute: 'Color', value: 'Black' },
          { attribute: 'Size', value: 'M' },
        ],
      },
      {
        sku: 'TSHIRT-BLK-L',
        attributes: [
          { attribute: 'Color', value: 'Black' },
          { attribute: 'Size', value: 'L' },
        ],
      },
    ],
  },
];
