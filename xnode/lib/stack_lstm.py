import torch
import xtorch.nn as nn
import graphtracker as gt
from xtorch.autograd import Variable
import operator


class StackLSTM(nn.Module):
    def __init__(self, batch_size, dims):
        super(StackLSTM, self).__init__()
        self.batch_size = batch_size
        self.dims = dims
        self.layers = [nn.LSTMCell(dims[0], dims[1])]
        for i in range(1, len(dims) - 1):
            self.layers.append(nn.LSTMCell(dims[i], dims[i + 1]))
        for i, l in enumerate(self.layers):
            self.add_module('LSTM_{}'.format(i), l)

    def forward(self, input_seq):
        hiddens = [Variable(torch.randn(self.batch_size, dim)) for dim in self.dims[1:]]
        states = [Variable(torch.randn(self.batch_size, dim)) for dim in self.dims[1:]]
        for token in input_seq:
            new_hiddens = []
            new_states = []
            x = token
            for i, l in enumerate(self.layers):
                h, c = l(x, (hiddens[i], states[i]))
                new_hiddens.append(h)
                new_states.append(c)
                x = h
            gt.tick(x, 0)
            hiddens = new_hiddens
            states = new_states
        return x


class PseudoLogLSTM(nn.Module):
    def __init__(self, batch_size, dims):
        super(PseudoLogLSTM, self).__init__()
        self.batch_size = batch_size
        self.dims = dims
        self.layers = [nn.LSTMCell(dims[0], dims[1])]
        for i in range(1, len(dims) - 1):
            self.layers.append(nn.LSTMCell(dims[i], dims[i + 1]))
        for i, l in enumerate(self.layers):
            self.add_module('LSTM_{}'.format(i), l)

    def cell_forward(self, l, x, i, hidden_in, state_in, older_hidden, older_state):
        hidden_in = hidden_in + older_hidden
        state_in = state_in + older_state

        return l(x, (hidden_in, state_in))

    def forward(self, input_seq):
        older_hiddens = []
        older_states = []
        hiddens = [Variable(torch.randn(self.batch_size, dim)) for dim in self.dims[1:]]
        states = [Variable(torch.randn(self.batch_size, dim)) for dim in self.dims[1:]]
        for token in input_seq:
            new_hiddens = []
            new_states = []
            x = token
            for i, l in enumerate(self.layers):
                h, c = gt.AbstractContainerGenerator(self.cell_forward)(l, x, i, hiddens[i], states[i],
                                                                        older_hiddens[i] if len(older_hiddens) > 0
                                                                        else Variable(torch.zeros(hiddens[i].size())),
                                                                        older_states[i] if len(older_states) > 0
                                                                        else Variable(torch.zeros(hiddens[i].size())))
                new_hiddens.append(h)
                new_states.append(c)
                x = h
            gt.tick(x, 0)
            older_hiddens = hiddens
            older_states = states
            hiddens = new_hiddens
            states = new_states
        return x
