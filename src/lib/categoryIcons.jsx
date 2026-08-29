import React from "react";
import {
  Utensils,
  Car,
  Home,
  Gamepad2,
  HeartPulse,
  Wallet,
  Package,
  ShoppingCart,
  Plane,
  GraduationCap,
  Shirt,
  Zap,
  Wifi,
  Dog,
  Gift,
  Dumbbell,
  Fuel,
  CreditCard,
  Coffee,
  Smartphone,
  Baby,
  Scissors,
  PiggyBank,
  Church,
  Landmark,
  Handshake,
} from "lucide-react";

// Cada regra casa por palavra chave dentro do nome da categoria.
// A primeira que casar define o ícone e a cor.
const RULES = [
  [["aliment", "comida", "mercado", "supermerc", "restaurante", "almoc", "almoç", "janta"], Utensils, "#C2612F"],
  [["cafe", "café", "padaria", "lanche"], Coffee, "#8A5A2B"],
  [["transport", "uber", "onibus", "ônibus", "taxi", "carro", "veic"], Car, "#3C6E9F"],
  [["combust", "gasolina", "posto", "etanol"], Fuel, "#9A4B2C"],
  [["moradia", "aluguel", "casa", "condominio", "condomínio"], Home, "#4C6B57"],
  [["luz", "energia", "agua", "água", "gas", "gás"], Zap, "#B08A34"],
  [["internet", "wifi", "tv"], Wifi, "#3C6E9F"],
  [["telefone", "celular", "chip"], Smartphone, "#5B5F8A"],
  [["lazer", "jogo", "game", "cinema", "festa", "bar"], Gamepad2, "#7A4F8C"],
  [["saude", "saúde", "medic", "farmac", "farmác", "hospital", "dentist"], HeartPulse, "#B4432A"],
  [["academia", "gym", "treino", "esporte"], Dumbbell, "#2F6E4F"],
  [["salario", "salário", "renda", "receita", "pagamento", "freela"], Wallet, "#2F6E4F"],
  [["investi", "poupanc", "poupanç", "reserva"], PiggyBank, "#2F6E4F"],
  [["compra", "shopping", "loja"], ShoppingCart, "#8C5A2B"],
  [["roupa", "vestu", "calcado", "calçado"], Shirt, "#7A4F8C"],
  [["viagem", "passagem", "hotel", "ferias", "férias"], Plane, "#3C6E9F"],
  [["educa", "estudo", "escola", "faculdade", "curso", "livro", "ingles", "inglês", "idioma"], GraduationCap, "#4C5C6E"],
  [["emprestimo", "empréstimo", "financiamento", "consignado", "banco"], Landmark, "#5B5F8A"],
  [["acordo", "divida", "dívida", "negocia", "serasa", "parcelamento"], Handshake, "#8C5A2B"],
  [["pet", "cachorro", "gato", "animal"], Dog, "#8A5A2B"],
  [["filho", "crianc", "crianç", "bebe", "bebê", "escolar"], Baby, "#C2612F"],
  [["presente", "doacao", "doação", "aniversario", "aniversário"], Gift, "#B08A34"],
  [["beleza", "cabelo", "salao", "salão", "estetica", "estética"], Scissors, "#7A4F8C"],
  [["igreja", "dizimo", "dízimo", "oferta"], Church, "#4C5C6E"],
  [["cartao", "cartão", "fatura", "credito", "crédito"], CreditCard, "#B4432A"],
];

const FALLBACK = [Package, "#4C5C6E"];

export function iconForCategory(category) {
  const name = (category || "").toLowerCase();
  for (const [keywords, Icon, color] of RULES) {
    if (keywords.some((k) => name.includes(k))) return [Icon, color];
  }
  return FALLBACK;
}

export default function CategoryIcon({ category, size = 32, iconSize = 16 }) {
  const [Icon, color] = iconForCategory(category);
  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: `${color}1F`,
        color,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flex: "0 0 auto",
      }}
    >
      <Icon size={iconSize} strokeWidth={2} />
    </span>
  );
}
