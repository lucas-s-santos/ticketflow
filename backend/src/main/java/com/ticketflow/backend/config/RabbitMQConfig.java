package com.ticketflow.backend.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.DirectExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

// Declara a topologia do RabbitMQ como beans. Ao subir, o Spring cria automaticamente
// a fila, a exchange e o binding no broker (se ainda não existirem).
//
// Fluxo: PaymentService publica em EXCHANGE com ROUTING_KEY → a exchange roteia
// para QUEUE → o PaymentProcessor (@RabbitListener) consome.
@Configuration
public class RabbitMQConfig {

    public static final String EXCHANGE = "payments.exchange";
    public static final String QUEUE = "payments.process.queue";
    public static final String ROUTING_KEY = "payment.process";

    // Queue durável: sobrevive a um restart do RabbitMQ (mensagens não se perdem).
    @Bean
    public Queue paymentsQueue() {
        return new Queue(QUEUE, true);
    }

    // DirectExchange: roteia mensagens para filas cuja routing key bate exatamente.
    @Bean
    public DirectExchange paymentsExchange() {
        return new DirectExchange(EXCHANGE);
    }

    // Binding: liga a fila à exchange usando a routing key.
    @Bean
    public Binding paymentsBinding(Queue paymentsQueue, DirectExchange paymentsExchange) {
        return BindingBuilder.bind(paymentsQueue).to(paymentsExchange).with(ROUTING_KEY);
    }

    // Converte objetos Java ↔ JSON nas mensagens. Sem isso, o Spring usaria
    // serialização Java nativa (frágil e não interoperável).
    @Bean
    public MessageConverter jsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    // RabbitTemplate com o converter JSON — usado pelo PaymentService para publicar.
    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory, MessageConverter converter) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(converter);
        return template;
    }
}
